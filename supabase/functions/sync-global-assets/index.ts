import { yahooCaller } from '../_shared/yahooAuthorization.ts';
import { quoteStamp, selectedProviders } from './quotes.ts';
// Edge Function: sync-global-assets
//
// Atualiza price_history para ativos internacionais:
//   - finnhub    : stocks US e REITs (free: 60 req/min, cotação atual com OHLV)
//   - coingecko  : criptomoedas (USD)
//   - awesomeapi : forex (USD/BRL)
//
// Agendada a cada 5 min durante o pregão da NYSE (migration 018).
//
// CHAVES (lidas do Vault — mesmo padrão de sync-brapi-prices)
//   'finnhub_key'   → token Finnhub
//   'coingecko_key' → chave CoinGecko (opcional, funciona sem ela no free)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Lê um secret do Vault via PostgREST (service role). */
async function vaultSecret(name: string): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vault_decrypted_secrets?select=decrypted_secret&name=eq.${encodeURIComponent(name)}&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) return '';
  const rows = await res.json();
  return rows?.[0]?.decrypted_secret ?? '';
}

/** SELECT em assets filtrando por providers globais. */
async function listGlobalAssets(): Promise<{ ticker: string; provider_symbol: string | null; quote_provider: string; currency: string }[]> {
  const rows: { ticker: string; provider_symbol: string | null; quote_provider: string; currency: string }[] = [];
  for (let offset = 0; ; offset += 500) {
  const url = `${SUPABASE_URL}/rest/v1/assets`
    + `?select=ticker,provider_symbol,quote_provider,currency`
    + `&active=eq.true`
    + `&quote_provider=in.(finnhub,coingecko,awesomeapi)&order=ticker&limit=500&offset=${offset}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`assets select ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const page = await res.json(); rows.push(...page);
  if (page.length < 500) return rows;
  }
}

/** Upsert em price_history, idempotente por (ticker, date). */
async function upsertPrices(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  for (const row of rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/store_global_quote`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_quote: row }), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('Falha ao gravar cotação global');
  }
}

/** Pausa em ms. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405, headers: CORS });
  const caller = await yahooCaller(req, SUPABASE_URL, SERVICE_KEY);
  if (caller.kind !== 'service') return new Response('Não autorizado', { status: caller.kind === 'denied' ? caller.status : 403, headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const providers = selectedProviders(body);
    const assets = (await listGlobalAssets()).filter(asset => providers.includes(asset.quote_provider));
    if (!assets.length) {
      return new Response(JSON.stringify({ total: 0, success: 0, failed: 0, errors: [] }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const byProvider: Record<string, typeof assets> = {};
    for (const a of assets) {
      if (!byProvider[a.quote_provider]) byProvider[a.quote_provider] = [];
      byProvider[a.quote_provider].push(a);
    }

    const today = new Date().toISOString().split('T')[0];
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // ── Finnhub (stocks US e REITs) ─────────────────────────────────────────
    // Free: 60 req/min. 26 tickers em paralelo com lotes de 30 e pausa de
    // 1 s entre lotes → bem dentro do limite.
    const fhAssets = byProvider['finnhub'] ?? [];
    if (fhAssets.length > 0) {
      const fhKey = Deno.env.get('FINNHUB_API_KEY')
        ?? await vaultSecret('finnhub_key');

      if (!fhKey) {
        for (const a of fhAssets) errors.push(`${a.ticker}: finnhub_key não configurada`);
        failed += fhAssets.length;
      } else {
        // Processar em lotes de 30 req paralelas (safe dentro de 60 req/min)
        const BATCH = 30;
        for (let i = 0; i < fhAssets.length; i += BATCH) {
          if (i > 0) await sleep(1100); // pausa entre lotes
          const batch = fhAssets.slice(i, i + BATCH);
          const results = await Promise.allSettled(
            batch.map(async (asset) => {
              const sym = asset.provider_symbol ?? asset.ticker;
              const res = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${fhKey}`,
                { signal: AbortSignal.timeout(8_000) },
              );
              if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
              const json = await res.json();
              // c=0 significa sem dado (mercado fechado sem cotação)
              if (!json.c || json.c === 0) throw new Error(`sem cotação (c=${json.c})`);
              await upsertPrices([{
                ticker: asset.ticker,
                ...quoteStamp(json.t, json.c),
                close: json.c,
                open: json.o ?? json.c,
                high: json.h ?? json.c,
                low: json.l ?? json.c,
                adjusted_close: json.c,
                volume: json.v ?? null,
                source: 'finnhub',
              }]);
              return asset.ticker;
            }),
          );
          for (let j = 0; j < results.length; j++) {
            const r = results[j];
            if (r.status === 'fulfilled') {
              success++;
            } else {
              failed++;
              errors.push(`${batch[j].ticker}: provider_request_failed`);
            }
          }
        }
      }
    }

    // ── CoinGecko (cripto) ──────────────────────────────────────────────────
    const cgAssets = byProvider['coingecko'] ?? [];
    if (cgAssets.length > 0) {
      const cgKey = Deno.env.get('COINGECKO_API_KEY')?.trim()
        || Deno.env.get('COINGECKO_KEY')?.trim()
        || await vaultSecret('coingecko_key');
      const ids = [...new Set(cgAssets.map((a) => a.provider_symbol ?? a.ticker))].join(',');
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl&include_last_updated_at=true`,
          {
            headers: cgKey ? { 'x-cg-demo-api-key': cgKey } : {},
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (!res.ok) throw new Error(`Provedor HTTP ${res.status}`);
        const json = await res.json();
        const upserts: Record<string, unknown>[] = [];
        for (const asset of cgAssets) {
          const sym = asset.provider_symbol ?? asset.ticker;
          const price = json[sym]?.[asset.currency.toLowerCase()];
          if (!price) { failed++; errors.push(`${asset.ticker}: coingecko sem preço`); continue; }
          upserts.push({
            ticker: asset.ticker, ...quoteStamp(json[sym]?.last_updated_at, price),
            close: price, open: price, high: price, low: price,
            adjusted_close: price, volume: null, source: 'coingecko',
          });
        }
        await upsertPrices(upserts);
        success += upserts.length;
      } catch (e) {
        for (const a of cgAssets) errors.push(`${a.ticker}: coingecko: ${e instanceof Error && /^(Provedor HTTP [0-9]{3}|invalid_quote)$/.test(e.message) ? e.message : "request_failed"}`);
        failed += cgAssets.length;
      }
    }

    // ── AwesomeAPI (forex) ──────────────────────────────────────────────────
    const awAssets = byProvider['awesomeapi'] ?? [];
    if (awAssets.length > 0) {
      const results = await Promise.allSettled(awAssets.map(async (asset) => {
        const sym = asset.provider_symbol ?? asset.ticker;
        const res = await fetch(
          `https://economia.awesomeapi.com.br/json/last/${sym}`,
          { signal: AbortSignal.timeout(5_000) },
        );
        if (!res.ok) throw new Error(`Provedor HTTP ${res.status}`);
        const json = await res.json();
        const key = sym.replace('-', '');
        const price = parseFloat(json[key]?.bid ?? '');
        if (!price || isNaN(price)) throw new Error(`${asset.ticker}: awesomeapi sem bid`);
        await upsertPrices([{
          ticker: asset.ticker, ...quoteStamp(Number(json[key]?.timestamp), price),
          close: price, open: price, high: price, low: price,
          adjusted_close: price, volume: null, source: 'awesomeapi',
        }]);
        return asset.ticker;
      }));
      for (const r of results) {
        if (r.status === 'fulfilled') success++;
        else { failed++; errors.push((r as PromiseRejectedResult).reason?.message ?? 'awesomeapi error'); }
      }
    }

    return new Response(
      JSON.stringify({ date: today, total: assets.length, success, failed, errors: errors.slice(0, 20) }),
      { status: failed ? 503 : 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error && err.message === 'invalid_providers' ? 'invalid_providers' : 'global_sync_failed' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
