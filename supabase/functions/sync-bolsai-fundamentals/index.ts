// Edge Function: sync-bolsai-fundamentals
//
// Sincroniza indicadores fundamentalistas e dividendos históricos de ativos BR
// (stock_br, fii, bdr) via API da bolsai.dev. Agendada 1× por dia fora do
// pregão (21h UTC / 18h BRT), após o COTAHIST noturno.
//
// FONTE: https://api.usebolsai.com/api/v1
//   GET /fundamentals/{ticker}  → 27 indicadores TTM (P/L, P/VP, ROE, DY…)
//   GET /dividends/{ticker}     → histórico de dividendos e JCP com datas
//
// PLANO FREE bolsai
//   200 req/dia. Com 27 ativos BR:
//   - 27 req para fundamentais
//   - 27 req para dividendos
//   Total: 54 req/execução — 27% da cota diária.
//
// CAMPOS
//   fundamentals: pl, pvp, roe, dy, debt_equity, net_margin, lpa, vpa
//   dividends:    ex_date, payment_date, value_per_share, type (dividend|jcp)
//
//   Bolsai retorna roe, net_margin, dividend_yield já em % (ex: 26.6, não 0.266).
//   O schema aceita valores entre -100 e 100, então usa-se direto sem conversão.
//
// UPSERT
//   fundamentals: ON CONFLICT (ticker, reference_date) → merge
//   dividends:    ON CONFLICT (ticker, ex_date, type) → merge
//   reference_date = data de hoje (snapshot diário dos indicadores TTM)
//
// SEGURANÇA
//   verify_jwt = true. Invocada pelo pg_cron com service role key do Vault.
//
// VARIÁVEIS DE AMBIENTE
//   SUPABASE_URL              URL do projeto
//   SUPABASE_SERVICE_ROLE_KEY Service role key para PostgREST
//   BOLSAI_KEY                API key bolsai (header X-API-Key)
//
// NOTA SOBRE O SDK
//   Não usa @supabase/supabase-js: causa BOOT_ERROR sem import map.
//   Toda comunicação via fetch direto ao PostgREST.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOLSAI_KEY   = Deno.env.get('BOLSAI_KEY') ?? '';

const BOLSAI_BASE  = 'https://api.usebolsai.com/api/v1';

/** Pausa entre requisições à bolsai (ms). */
const PAUSA_MS = 400;

/** Timeout por requisição (ms). */
const FETCH_TIMEOUT_MS = 12_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── tipos ────────────────────────────────────────────────────────────────

interface AtivoRow {
  ticker: string;
}

interface BolsaiFundamentals {
  ticker?: string;
  close_price?: number | null;
  pl?: number | null;
  pvp?: number | null;
  roe?: number | null;           // já em % (ex: 26.6)
  dividend_yield?: number | null; // já em % (ex: 7.1)
  net_debt_ebitda?: number | null;
  net_margin?: number | null;    // já em % (ex: 22.23)
  lpa?: number | null;
  vpa?: number | null;
  ev_ebitda?: number | null;
  gross_margin?: number | null;
}

interface BolsaiDividendPayment {
  ex_date?: string | null;
  payment_date?: string | null;
  value_per_share?: number | null;
  type?: string | null;          // 'DIVIDENDO', 'JCP', etc.
}

interface BolsaiDividends {
  ticker?: string;
  dividend_yield_ttm?: number | null;
  payments?: BolsaiDividendPayment[];
}

// ─── PostgREST helpers ────────────────────────────────────────────────────

async function pgSelectAtivosBR(): Promise<AtivoRow[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/assets` +
    `?select=ticker&active=eq.true&type=in.(stock_br,fii,bdr)`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST SELECT assets ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

async function pgUpsertFundamentals(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const url = `${SUPABASE_URL}/rest/v1/fundamentals?on_conflict=ticker,reference_date`;
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
  if (!r.ok) throw new Error(`PostgREST UPSERT fundamentals ${r.status}: ${(await r.text()).slice(0, 120)}`);
}

async function pgUpsertDividends(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const url = `${SUPABASE_URL}/rest/v1/dividends?on_conflict=ticker,ex_date,type`;
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
  if (!r.ok) throw new Error(`PostgREST UPSERT dividends ${r.status}: ${(await r.text()).slice(0, 120)}`);
}

// ─── bolsai helpers ───────────────────────────────────────────────────────

async function bolsaiFetch<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(`${BOLSAI_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'X-API-Key': BOLSAI_KEY, Accept: 'application/json' },
    });
    if (r.status === 404) return null; // ativo sem cobertura — não é erro
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return await r.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── normalização ─────────────────────────────────────────────────────────

/** Garante que o valor está no range do schema; null se fora. */
function clampOrNull(v: number | null | undefined, min: number, max: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

function positiveOrNull(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

function nonNegativeOrNull(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v < 0) return null;
  return v;
}

/**
 * Normaliza o tipo de provento para o enum do schema: 'dividend' | 'jcp'.
 * Bolsai retorna strings como 'DIVIDENDO', 'JCP', 'RENDIMENTO', etc.
 */
function normalizarTipo(tipo: string | null | undefined): 'dividend' | 'jcp' | null {
  if (!tipo) return null;
  const t = tipo.toUpperCase();
  if (t.includes('JCP') || t.includes('JURO')) return 'jcp';
  if (t.includes('DIVID') || t.includes('REND') || t.includes('PROVENT')) return 'dividend';
  return 'dividend'; // fallback conservador
}

function fundamentalsToRow(ticker: string, d: BolsaiFundamentals, refDate: string): Record<string, unknown> | null {
  // pl e pvp são obrigatórios no schema (NOT NULL com checks positivos)
  const pl  = nonNegativeOrNull(d.pl);
  const pvp = positiveOrNull(d.pvp);
  const vpa = positiveOrNull(d.vpa);
  const roe = clampOrNull(d.roe, -100, 100);
  const dy  = nonNegativeOrNull(d.dividend_yield);
  const net_margin = clampOrNull(d.net_margin, -100, 100);
  const debt_equity = nonNegativeOrNull(d.net_debt_ebitda); // melhor proxy disponível no plano free
  const lpa = d.lpa != null && Number.isFinite(d.lpa) ? d.lpa : null;

  // Se campos obrigatórios estiverem nulos, descarta a linha
  if (pl === null || pvp === null || vpa === null || roe === null ||
      dy === null || net_margin === null || debt_equity === null || lpa === null) {
    return null;
  }

  return {
    ticker,
    reference_date: refDate,
    pl,
    pvp,
    roe,
    dy,
    debt_equity,
    net_margin,
    lpa,
    vpa,
    source: 'bolsai',
  };
}

function dividendsToRows(ticker: string, d: BolsaiDividends): Record<string, unknown>[] {
  if (!d.payments?.length) return [];
  const rows: Record<string, unknown>[] = [];

  for (const p of d.payments) {
    if (!p.ex_date || !p.value_per_share || p.value_per_share <= 0) continue;

    // ex_date vem como 'YYYY-MM-DD' ou 'DD/MM/YYYY' — normaliza para ISO
    let exDate = p.ex_date;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(exDate)) {
      const [dd, mm, yyyy] = exDate.split('/');
      exDate = `${yyyy}-${mm}-${dd}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exDate)) continue; // descarta data inválida

    let payDate: string | null = null;
    if (p.payment_date) {
      payDate = p.payment_date;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(payDate)) {
        const [dd, mm, yyyy] = payDate.split('/');
        payDate = `${yyyy}-${mm}-${dd}`;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) payDate = null;
    }

    const tipo = normalizarTipo(p.type);
    if (!tipo) continue;

    rows.push({
      ticker,
      ex_date: exDate,
      payment_date: payDate,
      value_per_share: p.value_per_share,
      type: tipo,
      source: 'bolsai',
    });
  }
  return rows;
}

// ─── handler principal ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!BOLSAI_KEY) {
    return new Response(
      JSON.stringify({ error: 'BOLSAI_KEY não configurada no Vault' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const ativos = await pgSelectAtivosBR();
    if (!ativos.length) {
      return new Response(
        JSON.stringify({ msg: 'nenhum ativo BR ativo no catálogo', processados: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const hoje = new Date().toISOString().slice(0, 10);

    let fundOk = 0, fundFalhou = 0;
    let divOk = 0, divFalhou = 0;
    const erros: string[] = [];
    const fundRows: Record<string, unknown>[] = [];
    const divRows: Record<string, unknown>[] = [];

    for (let i = 0; i < ativos.length; i++) {
      const { ticker } = ativos[i];

      // 1. Fundamentais
      const fund = await bolsaiFetch<BolsaiFundamentals>(`/fundamentals/${ticker}`);
      if (fund) {
        const row = fundamentalsToRow(ticker, fund, hoje);
        if (row) {
          fundRows.push(row);
          fundOk++;
        } else {
          fundFalhou++;
          erros.push(`${ticker}: fundamentais incompletos`);
        }
      } else {
        fundFalhou++;
        erros.push(`${ticker}: sem cobertura em /fundamentals`);
      }

      await sleep(PAUSA_MS);

      // 2. Dividendos
      const divs = await bolsaiFetch<BolsaiDividends>(`/dividends/${ticker}`);
      if (divs) {
        const rows = dividendsToRows(ticker, divs);
        divRows.push(...rows);
        divOk++;
      } else {
        divFalhou++;
        // não logar como erro — FIIs sem dividendos históricos são normais
      }

      // pausa entre ativos (exceto último)
      if (i < ativos.length - 1) await sleep(PAUSA_MS);
    }

    // upsert em lote
    await pgUpsertFundamentals(fundRows);
    await pgUpsertDividends(divRows);

    return new Response(
      JSON.stringify({
        ativos_processados:     ativos.length,
        requisicoes_bolsai:     ativos.length * 2, // 1 fund + 1 div por ativo
        fundamentais_gravados:  fundOk,
        fundamentais_falha:     fundFalhou,
        dividendos_gravados:    divRows.length,
        ativos_sem_dividendos:  divFalhou,
        erros:                  erros.slice(0, 20),
        executado_em:           new Date().toISOString(),
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
