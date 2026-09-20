// Edge Function: sync-yahoo-fundamentals
//
// Sincroniza indicadores fundamentalistas via Yahoo Finance para todos os
// ativos ativos do catálogo (stock_br, fii, bdr, stock_us, etf_us, reit),
// fazendo upsert na tabela `public.fundamentals` com source='yahoo'.
//
// Substitui o sync-bolsai-fundamentals que falha para FIIs e muitos ativos BR.
//
// FLUXO
//   1. Obtém cookie de sessão em fc.yahoo.com (necessário para o crumb).
//   2. Obtém crumb via /v1/test/getcrumb (token CSRF por sessão).
//   3. Para cada ativo ativo do catálogo: GET /v10/finance/quoteSummary com
//      módulos defaultKeyStatistics + summaryDetail + financialData.
//   4. Mapeia e valida os campos contra as constraints da tabela fundamentals.
//   5. Upsert em lote na tabela (on_conflict = ticker, reference_date).
//
// AGENDAMENTO
//   Seg–Sex às 21h UTC (18h BRT) via pg_cron — mesmo horário anterior do bolsai.
//
// PADRÕES DO PROJETO (supabase/functions/README.md)
//   Sem @supabase/supabase-js. verify_jwt=false com detecção de service role.
//   Chamadas ao banco via fetch direto ao PostgREST.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const YAHOO_BASE       = 'https://query1.finance.yahoo.com'
const FETCH_TIMEOUT_MS = 12_000
const PAUSE_MS         = 300

// Tipos de ativo com fundamentais relevantes
const FUNDAMENTAL_ASSET_TYPES = 'stock_br,fii,bdr,stock_us,etf_us,reit'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function authMode(request: Request): 'service' | 'user' | null {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  if (token === SERVICE_KEY) return 'service'
  if (token.startsWith('ey')) return 'user'
  return null
}

function needsSaSuffix(ticker: string): boolean {
  if (ticker.includes('.')) return false
  return /\d$/.test(ticker)
}

function yahooSymbol(ticker: string, currency: string): string {
  // BRK.B → BRK-B no Yahoo Finance
  const normalized = ticker.replace('.', '-')
  return currency === 'USD' ? normalized : needsSaSuffix(ticker) ? `${ticker}.SA` : ticker
}

// ─── Crumb + Cookie ───────────────────────────────────────────────────────────

interface YahooSession {
  crumb: string
  cookie: string
}

/**
 * Obtém cookie de sessão do Yahoo e depois o crumb CSRF.
 * O crumb é válido por toda a execução da função.
 */
async function getYahooSession(): Promise<YahooSession | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    // 1. Sessão (cookie) via fc.yahoo.com
    const r0 = await fetch('https://fc.yahoo.com', {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)' },
    })
    const cookie = r0.headers.get('set-cookie') ?? ''

    // 2. Crumb
    const r1 = await fetch(`${YAHOO_BASE}/v1/test/getcrumb`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)',
        'Cookie': cookie,
        'Accept': 'text/plain',
      },
    })
    clearTimeout(timer)

    if (!r1.ok) return null
    const crumb = (await r1.text()).trim()
    if (!crumb || crumb.includes('{')) return null // erro JSON em vez de crumb

    return { crumb, cookie }
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ─── Yahoo Finance — quoteSummary ─────────────────────────────────────────────

interface YahooFundamentals {
  lpa: number | null
  vpa: number | null
  pl: number | null
  pvp: number | null
  dy: number | null
  roe: number | null
  net_margin: number | null
  debt_equity: number | null
}

function clamp(v: number | null | undefined, min: number, max: number): number | null {
  if (v == null || !Number.isFinite(v)) return null
  // Clampar ao limite em vez de descartar — ROE de empresas com recompra pode ultrapassar 100%
  return Math.max(min, Math.min(max, v))
}

function nonNeg(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v < 0) return null
  return v
}

function pos(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null
  return v
}

function finite(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return v
}

async function fetchYahooFundamentals(
  ticker: string,
  currency: string,
  session: YahooSession,
): Promise<YahooFundamentals | null> {
  const symbol = yahooSymbol(ticker, currency)
  const url = `${YAHOO_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,summaryDetail,financialData&crumb=${encodeURIComponent(session.crumb)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)',
        'Cookie': session.cookie,
        'Accept': 'application/json',
      },
    })
    clearTimeout(timer)

    if (!resp.ok) return null

    const data = await resp.json() as {
      quoteSummary: {
        result: Array<{
          defaultKeyStatistics: Record<string, { raw?: number }>
          summaryDetail: Record<string, { raw?: number }>
          financialData: Record<string, { raw?: number }>
        }> | null
        error?: unknown
      }
    }

    if (data.quoteSummary.error || !data.quoteSummary.result?.[0]) return null

    const ks = data.quoteSummary.result[0].defaultKeyStatistics
    const sd = data.quoteSummary.result[0].summaryDetail
    const fd = data.quoteSummary.result[0].financialData

    const rawLpa         = finite(ks.trailingEps?.raw)
    const rawVpa         = pos(ks.bookValue?.raw)
    const rawPl          = nonNeg(sd.trailingPE?.raw)
    const rawPvp         = pos(ks.priceToBook?.raw)
    // DY vem como decimal (0.13 = 13%) → converter para %
    const rawDy          = nonNeg((sd.dividendYield?.raw ?? 0) * 100)
    // ROE vem como decimal → converter para % e clampar em [-100, 100]
    const rawRoe         = clamp((fd.returnOnEquity?.raw ?? null) !== null ? (fd.returnOnEquity!.raw! * 100) : null, -100, 100)
    // Net margin vem como decimal → converter para % e clampar
    const rawNetMargin   = clamp((fd.profitMargins?.raw ?? null) !== null ? (fd.profitMargins!.raw! * 100) : null, -100, 100)
    // debtToEquity já vem em % direto no Yahoo (ex: 76.067 = 76%)
    const rawDebtEquity  = nonNeg(fd.debtToEquity?.raw)

    return {
      lpa: rawLpa,
      vpa: rawVpa,
      pl: rawPl,
      pvp: rawPvp,
      dy: rawDy,
      roe: rawRoe,
      net_margin: rawNetMargin,
      debt_equity: rawDebtEquity,
    }
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ─── Upsert no banco ──────────────────────────────────────────────────────────

interface FundamentalsRow {
  ticker: string
  reference_date: string
  pl: number
  pvp: number
  roe: number
  dy: number
  debt_equity: number
  net_margin: number
  lpa: number
  vpa: number
  source: string
}

async function upsertFundamentals(rows: FundamentalsRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const r = await rest('fundamentals?on_conflict=ticker,reference_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  return r.ok ? rows.length : 0
}

// ─── handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return jsonResp({ error: 'Método não permitido.' }, 405)

  const mode = authMode(req)
  if (!mode) return jsonResp({ error: 'Autenticação necessária.' }, 401)

  // Buscar todos os ativos ativos do catálogo
  const assetsResp = await rest(
    `assets?active=eq.true&type=in.(${FUNDAMENTAL_ASSET_TYPES})&select=ticker,currency`,
  )
  if (!assetsResp.ok) return jsonResp({ error: 'Falha ao ler catálogo de ativos.' }, 500)
  const assets = (await assetsResp.json()) as Array<{ ticker: string; currency: string }>

  if (assets.length === 0) {
    return jsonResp({ processados: 0, gravados: 0, falhas: 0 })
  }

  // Obter sessão Yahoo (crumb + cookie)
  const session = await getYahooSession()
  if (!session) {
    return jsonResp({ error: 'Não foi possível obter sessão do Yahoo Finance.' }, 502)
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows: FundamentalsRow[] = []
  let falhas = 0
  let processados = 0

  for (let i = 0; i < assets.length; i++) {
    const { ticker, currency } = assets[i]
    const fund = await fetchYahooFundamentals(ticker, currency, session)

    if (
      fund &&
      fund.vpa !== null &&
      fund.pvp !== null &&
      fund.roe !== null &&
      fund.dy !== null
    ) {
      // Campos com fallback para FIIs e ETFs que não têm todos os indicadores
      rows.push({
        ticker,
        reference_date: today,
        pl:           fund.pl          ?? 0,      // FIIs sem P/L definido usam 0
        pvp:          fund.pvp,
        roe:          fund.roe,
        dy:           fund.dy,
        debt_equity:  fund.debt_equity ?? 0,      // FIIs sem D/E usam 0
        net_margin:   fund.net_margin  ?? 0,      // FIIs sem margem usam 0
        lpa:          fund.lpa         ?? 0,      // FIIs sem EPS usam 0
        vpa:          fund.vpa,
        source: 'yahoo',
      })
      processados++
    } else {
      falhas++
    }

    if (i < assets.length - 1) await sleep(PAUSE_MS)
  }

  const gravados = await upsertFundamentals(rows)

  return jsonResp({
    processados,
    gravados,
    falhas,
    total_ativos: assets.length,
    executado_em: new Date().toISOString(),
  })
})
