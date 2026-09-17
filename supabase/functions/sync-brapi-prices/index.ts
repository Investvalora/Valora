// Edge Function: sync-brapi-prices
//
// Atualização intradiária de cotações BR via brapi.dev.
// Busca o preço atual (regularMarketPrice + OHLV do dia) de todos os ativos
// com quote_provider = 'brapi' (stock_br, fii, bdr) e faz upsert em
// price_history para a data corrente.
//
// PLANO FREE brapi.dev
//   - 1 ativo por requisição (multi-ticker não suportado no plano gratuito)
//   - Dados atualizados a cada 30 minutos
//   - 15.000 req/ciclo (mês)
//
// ESTRATÉGIA
//   Uma requisição por ativo, em sequência com pausa curta entre chamadas.
//   Com 27 ativos BR, cada execução consome 27 req.
//   A 14 execuções/dia (cada 30min, 13h–19h30 UTC = 10h–16h30 BRT) ×
//   22 dias úteis/mês ≈ 8.316 req/mês (~55% da cota free).
//
// PREGÃO B3 (desde março de 2026)
//   10h00–16h55 BRT = 13h00–19h55 UTC
//   Agendamento: 13:00–19:30 UTC a cada 30min (14 slots) seg–sex
//   O COTAHIST noturno (sync-b3-prices, 22h UTC) grava o fechamento oficial.
//
// UPSERT
//   ON CONFLICT (ticker, date) → merge dos campos OHLCV.
//   `source = 'brapi'` durante o pregão; COTAHIST sobrescreve com
//   'b3_cotahist' no fechamento noturno.
//
// SEGURANÇA
//   verify_jwt = true. Invocada pelo pg_cron com service role key do Vault.
//
// VARIÁVEIS DE AMBIENTE
//   SUPABASE_URL              URL do projeto
//   SUPABASE_SERVICE_ROLE_KEY Service role key para PostgREST
//   BRAPI_KEY                 Token brapi.dev
//
// NOTA SOBRE O SDK
//   Não usa @supabase/supabase-js: causa BOOT_ERROR sem import map.
//   Toda comunicação via fetch direto ao PostgREST.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BRAPI_KEY    = Deno.env.get('BRAPI_API_KEY') ?? Deno.env.get('BRAPI_KEY') ?? '';

/** Pausa entre requisições à brapi (ms). Evita burst no rate limit. */
const PAUSA_MS = 300;

/** Timeout por requisição à brapi (ms). */
const FETCH_TIMEOUT_MS = 10_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── tipos ────────────────────────────────────────────────────────────────

interface AtivoRow {
  ticker: string;
  provider_symbol: string | null;
}

interface BrapiResult {
  symbol: string;
  regularMarketPrice: number | null;
  regularMarketOpen: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  regularMarketVolume: number | null;
  regularMarketTime: string | null;
}

interface BrapiResponse {
  results?: BrapiResult[];
  error?: boolean;
  message?: string;
}

// ─── PostgREST helpers ────────────────────────────────────────────────────

async function pgSelectAtivosBR(): Promise<AtivoRow[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/assets` +
    `?select=ticker,provider_symbol&active=eq.true&type=in.(stock_br,fii,bdr,etf_br)`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) {
    throw new Error(`PostgREST SELECT ${r.status}: ${(await r.text()).slice(0, 120)}`);
  }
  return r.json();
}

async function pgUpsertPrecos(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const url = `${SUPABASE_URL}/rest/v1/price_history?on_conflict=ticker,date`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    throw new Error(`PostgREST UPSERT ${r.status}: ${(await r.text()).slice(0, 120)}`);
  }
}

// ─── brapi helpers ────────────────────────────────────────────────────────

/**
 * Busca cotação de UM único ativo.
 * Plano free brapi = 1 ativo por requisição.
 * Retorna null se o ativo não tiver preço válido ou der erro.
 */
async function fetchBrapiAtivo(symbol: string): Promise<BrapiResult | null> {
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}`;
  const params = new URLSearchParams({ token: BRAPI_KEY });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const r = await fetch(`${url}?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
    }
    const json: BrapiResponse = await r.json();
    if (json.error) {
      throw new Error(json.message?.slice(0, 120) ?? 'erro brapi');
    }
    const result = json.results?.[0];
    if (!result || typeof result.regularMarketPrice !== 'number' || result.regularMarketPrice <= 0) {
      return null;
    }
    return result;
  } catch {
    return null; // falha de um ativo não aborta os demais
  } finally {
    clearTimeout(timer);
  }
}

// ─── conversão ────────────────────────────────────────────────────────────

function extrairData(marketTime: string | null): string {
  if (marketTime) {
    const d = marketTime.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return new Date().toISOString().slice(0, 10);
}

function resultToRow(
  tickerInterno: string,
  r: BrapiResult,
): Record<string, unknown> {
  return {
    ticker:         tickerInterno,
    date:           extrairData(r.regularMarketTime),
    open:           r.regularMarketOpen    ?? r.regularMarketPrice,
    high:           r.regularMarketDayHigh ?? r.regularMarketPrice,
    low:            r.regularMarketDayLow  ?? r.regularMarketPrice,
    close:          r.regularMarketPrice,
    adjusted_close: r.regularMarketPrice,  // ajuste real depende de dividendos (Épico 3)
    volume:         r.regularMarketVolume  ?? null,
    source:         'brapi',
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── handler principal ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (!BRAPI_KEY) {
    return new Response(
      JSON.stringify({ error: 'BRAPI_API_KEY (ou BRAPI_KEY) não configurada no Vault' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const ativos = await pgSelectAtivosBR();
    if (!ativos.length) {
      return new Response(
        JSON.stringify({ msg: 'nenhum ativo BR ativo no catálogo', linhas: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    let ok = 0, falhou = 0;
    const rows: Record<string, unknown>[] = [];
    const erros: string[] = [];

    for (const ativo of ativos) {
      const symbol = ativo.provider_symbol ?? ativo.ticker;
      const result = await fetchBrapiAtivo(symbol);

      if (result) {
        rows.push(resultToRow(ativo.ticker, result));
        ok++;
      } else {
        falhou++;
        erros.push(symbol);
      }

      // pausa entre chamadas para não estourar rate limit
      if (ativos.indexOf(ativo) < ativos.length - 1) {
        await sleep(PAUSA_MS);
      }
    }

    // upsert em lote único (todos os ativos de uma vez no PostgREST)
    await pgUpsertPrecos(rows);

    return new Response(
      JSON.stringify({
        ativos_catalogo:  ativos.length,
        requisicoes_api:  ativos.length, // 1 req por ativo (plano free)
        linhas_gravadas:  ok,
        falhas:           falhou,
        tickers_falha:    erros.slice(0, 20),
        executado_em:     new Date().toISOString(),
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
