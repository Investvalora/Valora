// Edge Function: sync-dividends-yahoo
//
// Sincroniza dividendos dos últimos 2 anos via Yahoo Finance para todos os
// ativos ativos do catálogo (stock_br, fii, bdr, stock_us, etf_us, reit),
// persistindo na tabela `public.dividends` via upsert com source='yahoo'.
//
// Agendada 1× por dia (seg–sex 23h UTC / 20h BRT) via pg_cron, após o
// COTAHIST (22h) e os fundamentais (21h). Pode também ser invocada manualmente
// com JWT de usuário (botão "Atualizar proventos" na ProventosPage).
//
// MODOS DE OPERAÇÃO
//   1. Cron (service role key no header Authorization):
//      — Sem body ou body vazio → processa TODOS os ativos ativos do catálogo.
//   2. Manual (JWT de usuário):
//      — Body { "tickers": ["MXRF11","BBAS3"] } → só esses tickers.
//      — Body vazio → todos os ativos ativos (igual ao cron).
//
// RESPONSE 200
//   { "synced": 45, "inserted": 387, "tickers_processed": [...], "mode": "all" }
//
// PADRÕES DO PROJETO (supabase/functions/README.md)
//   Sem @supabase/supabase-js. verify_jwt=false com detecção de service role.
//   Chamadas ao banco via fetch direto ao PostgREST.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const YAHOO_BASE       = 'https://query1.finance.yahoo.com/v8/finance/chart'
const FETCH_TIMEOUT_MS = 15_000
const PAUSE_MS         = 350  // pausa entre requests Yahoo para evitar rate-limit

// Tipos de ativo com dividendos relevantes
const DIVIDEND_ASSET_TYPES = 'stock_br,fii,bdr,stock_us,etf_us,reit'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
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

/**
 * Verifica se a requisição veio autenticada (service role key ou JWT de usuário).
 * Retorna 'service' | 'user' | null.
 * - service role: pg_cron envia a service_role_key diretamente no Bearer.
 * - user JWT: frontend envia o JWT do usuário.
 */
function authMode(request: Request): 'service' | 'user' | null {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  // Service role key do projeto (não é JWT — não começa com "ey")
  if (token === SERVICE_KEY) return 'service'
  // JWT começa com "ey" (base64url de {"alg":...})
  if (token.startsWith('ey')) return 'user'
  return null
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

function needsSaSuffix(ticker: string): boolean {
  if (ticker.includes('.')) return false
  return /\d$/.test(ticker)
}

async function fetchYahooDividends(
  ticker: string,
  currency: string,
): Promise<Array<{ ex_date: string; value_per_share: number }>> {
  const symbol = currency === 'USD' ? ticker : needsSaSuffix(ticker) ? `${ticker}.SA` : ticker
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?events=dividends&range=2y&interval=1d`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)',
        Accept: 'application/json',
      },
    })
    clearTimeout(timer)
    if (!resp.ok) return []

    const data = await resp.json() as {
      chart: {
        result: Array<{
          events?: { dividends?: Record<string, { date: number; amount: number }> }
        }> | null
        error?: unknown
      }
    }

    if (data.chart.error || !data.chart.result?.[0]) return []

    const raw = data.chart.result[0].events?.dividends ?? {}
    const payments: Array<{ ex_date: string; value_per_share: number }> = []

    for (const entry of Object.values(raw)) {
      const amount = Number(entry.amount)
      if (!Number.isFinite(amount) || amount <= 0) continue
      payments.push({
        ex_date: new Date(entry.date * 1000).toISOString().slice(0, 10),
        value_per_share: amount,
      })
    }

    return payments
  } catch {
    clearTimeout(timer)
    return []
  }
}

// ─── Upsert no banco ──────────────────────────────────────────────────────────

interface DividendRow {
  ticker: string
  ex_date: string
  value_per_share: number
  type: string
  source: string
}

async function upsertDividends(rows: DividendRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const CHUNK = 200
  let total = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await rest('dividends?on_conflict=ticker,ex_date,type', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + CHUNK)),
    })
    if (r.ok) total += Math.min(CHUNK, rows.length - i)
  }
  return total
}

// ─── Lógica principal ─────────────────────────────────────────────────────────

async function runSync(tickers: Array<{ ticker: string; currency: string }>) {
  let totalInserted = 0
  let synced = 0
  const processed: string[] = []

  for (let i = 0; i < tickers.length; i++) {
    const { ticker, currency } = tickers[i]
    const payments = await fetchYahooDividends(ticker, currency)

    if (payments.length > 0) {
      const rows: DividendRow[] = payments.map((p) => ({
        ticker,
        ex_date: p.ex_date,
        value_per_share: p.value_per_share,
        type: 'dividend',
        source: 'yahoo',
      }))
      totalInserted += await upsertDividends(rows)
      synced++
    } else {
      synced++
    }

    processed.push(ticker)
    if (i < tickers.length - 1) await sleep(PAUSE_MS)
  }

  return { synced, inserted: totalInserted, tickers_processed: processed }
}

// ─── handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const mode = authMode(req)
  if (!mode) return json({ error: 'Autenticação necessária.' }, 401)

  // Parsear body (opcional)
  let requestedTickers: string[] | null = null
  try {
    const body = await req.json() as { tickers?: unknown }
    if (Array.isArray(body?.tickers) && body.tickers.length > 0) {
      requestedTickers = (body.tickers as unknown[])
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase())
    }
  } catch { /* body vazio */ }

  let tickers: Array<{ ticker: string; currency: string }> = []
  let syncMode: string

  if (requestedTickers && requestedTickers.length > 0) {
    // Tickers explícitos — buscar currency no catálogo
    const list = requestedTickers.map(encodeURIComponent).join(',')
    const r = await rest(`assets?ticker=in.(${list})&select=ticker,currency&active=eq.true`)
    tickers = r.ok
      ? (await r.json()) as Array<{ ticker: string; currency: string }>
      : requestedTickers.map((t) => ({ ticker: t, currency: 'BRL' }))
    syncMode = 'explicit'
  } else {
    // Sem tickers explícitos → todos os ativos ativos do catálogo com dividendos
    const r = await rest(
      `assets?active=eq.true&type=in.(${DIVIDEND_ASSET_TYPES})&select=ticker,currency`,
    )
    if (!r.ok) return json({ error: 'Falha ao ler catálogo de ativos.' }, 500)
    tickers = (await r.json()) as Array<{ ticker: string; currency: string }>
    syncMode = 'all'
  }

  if (tickers.length === 0) {
    return json({ synced: 0, inserted: 0, tickers_processed: [], mode: syncMode })
  }

  const result = await runSync(tickers)
  return json({ ...result, mode: syncMode, executado_em: new Date().toISOString() })
})
