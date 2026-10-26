// Edge Function: lookup-asset
//
// Recebe um ticker, consulta a brapi para verificar se existe, infere o tipo
// e moeda do ativo, e o insere no catálogo `assets` com service role.
// Chamada pelo front quando o usuário digita um ticker que não está no banco.
//
// REQUEST
//   POST /functions/v1/lookup-asset
//   Body: { "ticker": "WEGE3" }
//   Auth: Bearer <anon key ou user JWT> (verify_jwt = true)
//
// RESPONSE 200 — ativo encontrado (criado ou já existia)
//   { "ticker": "WEGE3", "name": "WEG SA", "type": "stock_br", "currency": "BRL", "created": true }
//
// RESPONSE 404 — brapi não conhece o ticker
//   { "error": "not_found", "message": "Ativo XPTO99 não encontrado na brapi." }
//
// RESPONSE 400 — ticker ausente ou inválido
//   { "error": "bad_request", "message": "..." }
//
// RESPONSE 500 — erro interno
//   { "error": "internal", "message": "..." }
//
// SEGURANÇA
//   verify_jwt = true — exige sessão válida do usuário.
//   O INSERT usa SUPABASE_SERVICE_ROLE_KEY via PostgREST — contorna o RLS
//   que bloqueia INSERT de `authenticated` em `assets`.
//   A anon key nunca é exposta; a service role key fica só no Vault.
//
// VARIÁVEIS DE AMBIENTE
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   BRAPI_API_KEY  (ou BRAPI_KEY como fallback)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BRAPI_KEY    = Deno.env.get('BRAPI_API_KEY') ?? Deno.env.get('BRAPI_KEY') ?? '';

const FETCH_TIMEOUT_MS = 10_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── tipos internos ───────────────────────────────────────────────────────

type AssetType = 'stock_br' | 'fii' | 'bdr' | 'stock_us' | 'reit' | 'crypto';
type Currency  = 'BRL' | 'USD';

interface AssetRow {
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  quote_provider: string;
  provider_symbol: string;
  active: boolean;
}

interface BrapiResult {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string | null;
  regularMarketPrice: number | null;
}

interface AssetQuote {
  price: number | null;
  source: string;
}

// ─── inferência de tipo/moeda ─────────────────────────────────────────────

/**
 * Infere o AssetType a partir do ticker e da currency retornada pela brapi.
 *
 * Regras (ordem importa):
 *  - currency != BRL            → stock_us (tratamos REITs como stock_us no MVP)
 *  - sufixo 11 ou 12            → fii
 *  - sufixo 32, 33, 34, 35      → bdr
 *  - demais                     → stock_br
 *
 * Essa heurística cobre >99% dos ativos da B3. Edge cases (ETFs, CRIs, etc.)
 * ficam como stock_br e o usuário pode ver no detalhe.
 */
function inferirTipo(ticker: string, currency: string | null): AssetType {
  if (currency && currency.toUpperCase() !== 'BRL') return 'stock_us';

  // Sufixo numérico
  const match = ticker.match(/(\d+)$/);
  const sufixo = match ? Number(match[1]) : null;

  if (sufixo === 11 || sufixo === 12) return 'fii';
  if (sufixo === 32 || sufixo === 33 || sufixo === 34 || sufixo === 35) return 'bdr';
  return 'stock_br';
}

function inferirMoeda(currency: string | null): Currency {
  return currency && currency.toUpperCase() === 'USD' ? 'USD' : 'BRL';
}

// ─── brapi ────────────────────────────────────────────────────────────────

async function fetchBrapi(ticker: string): Promise<BrapiResult | null> {
  if (!BRAPI_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${BRAPI_KEY}`;
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return null;

    const json = await r.json() as { results?: BrapiResult[]; error?: boolean };
    if (json.error) return null;

    const result = json.results?.[0];
    if (!result?.symbol) return null;
    // Garante que a brapi devolveu exatamente o ticker pedido.
    // Sem isso, um ticker inexistente retorna o primeiro resultado genérico
    // da brapi (ex: TOTS3 → TOT, um ETF americano).
    if (result.symbol.toUpperCase() !== ticker.toUpperCase()) return null;
    // Sem preço = ativo sem cotação (pode ser inativo ou código errado)
    if (!result.regularMarketPrice || result.regularMarketPrice <= 0) return null;

    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function vaultSecret(name: string): Promise<string> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/vault_decrypted_secrets?select=decrypted_secret&name=eq.${encodeURIComponent(name)}&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  )
  if (!response.ok) return ''
  const rows = await response.json() as Array<{ decrypted_secret?: string }>
  return rows[0]?.decrypted_secret ?? ''
}

async function fetchProviderQuote(asset: AssetRow): Promise<AssetQuote> {
  const symbol = asset.provider_symbol ?? asset.ticker;

  if (asset.quote_provider === 'brapi') {
    const result = await fetchBrapi(symbol);
    return { price: result?.regularMarketPrice ?? null, source: 'brapi' };
  }

  if (asset.quote_provider === 'finnhub') {
    const key = Deno.env.get('FINNHUB_API_KEY') ?? await vaultSecret('finnhub_key');
    if (!key) return { price: null, source: 'finnhub' };
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return { price: null, source: 'finnhub' };
    const data = await response.json() as { c?: number };
    return { price: typeof data.c === 'number' && data.c > 0 ? data.c : null, source: 'finnhub' };
  }

  if (asset.quote_provider === 'coingecko') {
    const key = Deno.env.get('COINGECKO_API_KEY') ?? await vaultSecret('coingecko_key');
    const headers = key ? { 'x-cg-demo-api-key': key } : undefined;
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=${asset.currency.toLowerCase()}`,
      { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return { price: null, source: 'coingecko' };
    const data = await response.json() as Record<string, Record<string, number>>;
    const price = data[symbol]?.[asset.currency.toLowerCase()];
    return { price: typeof price === 'number' && price > 0 ? price : null, source: 'coingecko' };
  }

  if (asset.quote_provider === 'twelvedata') {
    const key = Deno.env.get('TWELVEDATA_API_KEY') ?? await vaultSecret('twelvedata_key');
    if (!key) return { price: null, source: 'twelvedata' };
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return { price: null, source: 'twelvedata' };
    const data = await response.json() as { price?: string };
    const price = Number(data.price);
    return { price: Number.isFinite(price) && price > 0 ? price : null, source: 'twelvedata' };
  }

  return { price: null, source: asset.quote_provider };
}

// ─── PostgREST helpers ────────────────────────────────────────────────────

/** Busca o ativo no catálogo local (qualquer status de active). */
async function pgFindAsset(ticker: string): Promise<AssetRow | null> {
  const url = `${SUPABASE_URL}/rest/v1/assets?ticker=eq.${encodeURIComponent(ticker)}&limit=1`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST GET ${r.status}`);
  const rows = await r.json() as AssetRow[];
  return rows[0] ?? null;
}

/** Insere ativo no catálogo via service role (contorna RLS). */
async function pgInsertAsset(row: Omit<AssetRow, 'active'>): Promise<AssetRow> {
  const url = `${SUPABASE_URL}/rest/v1/assets`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ ...row, active: true }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`PostgREST INSERT ${r.status}: ${body.slice(0, 120)}`);
  }
  const rows = await r.json() as AssetRow[];
  return rows[0];
}

// ─── handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json400 = (msg: string) =>
    new Response(JSON.stringify({ error: 'bad_request', message: msg }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const json404 = (msg: string) =>
    new Response(JSON.stringify({ error: 'not_found', message: msg }),
      { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const json500 = (msg: string) =>
    new Response(JSON.stringify({ error: 'internal', message: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // 1. Parse do body
  let ticker: string;
  try {
    const body = await req.json() as { ticker?: unknown };
    if (typeof body?.ticker !== 'string' || !body.ticker.trim()) {
      return json400('Campo "ticker" é obrigatório.');
    }
    ticker = body.ticker.trim().toUpperCase();
    if (ticker.length > 20) return json400('Ticker inválido (máx. 20 caracteres).');
  } catch {
    return json400('Body inválido. Envie JSON com { "ticker": "WEGE3" }.');
  }

  try {
    // 2. Verifica se já existe no catálogo (mesmo inativo)
    const existing = await pgFindAsset(ticker);
    if (existing) {
      // Já existe — ativa se estava inativo e retorna
      if (!existing.active) {
        // Reativa via PATCH
        const url = `${SUPABASE_URL}/rest/v1/assets?ticker=eq.${encodeURIComponent(ticker)}`;
        await fetch(url, {
          method: 'PATCH',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ active: true }),
        });
      }
      return new Response(
        JSON.stringify({
          ticker: existing.ticker,
          name: existing.name,
          type: existing.type,
          currency: existing.currency,
          latestPrice: (await fetchProviderQuote(existing)).price,
          created: false,
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Consulta brapi
    if (!BRAPI_KEY) {
      return json500('BRAPI_API_KEY não configurada. Não é possível buscar ativos externos.');
    }

    const brapiResult = await fetchBrapi(ticker);
    if (!brapiResult) {
      return json404(`Ativo ${ticker} não encontrado. Verifique o código e tente novamente.`);
    }

    // 4. Infere metadados e insere
    const nome = brapiResult.longName ?? brapiResult.shortName ?? ticker;
    const tipo = inferirTipo(ticker, brapiResult.currency);
    const moeda = inferirMoeda(brapiResult.currency);

    const inserted = await pgInsertAsset({
      ticker,
      name: nome,
      type: tipo,
      currency: moeda,
      quote_provider: 'brapi',
      provider_symbol: ticker,
    });

    return new Response(
      JSON.stringify({
        ticker: inserted.ticker,
        name: inserted.name,
        type: inserted.type,
        currency: inserted.currency,
        latestPrice: brapiResult.regularMarketPrice,
        created: true,
      }),
      { status: 201, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return json500((e as Error).message.slice(0, 200));
  }
});
