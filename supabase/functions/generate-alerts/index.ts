const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const YAHOO_BASE       = 'https://query1.finance.yahoo.com/v8/finance/chart'
const FETCH_TIMEOUT_MS = 12_000
const PAUSE_MS         = 200

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

import { findAlertCandidates, findBazinAlertCandidates } from './logic.ts'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization || !SUPABASE_URL || !SERVICE_KEY) return null

  const result = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authorization },
  })
  if (!result.ok) return null

  const user = await result.json()
  return typeof user?.id === 'string' ? user.id : null
}

async function insertAlert(userId: string, payload: Record<string, unknown>) {
  const existing = await rest(
    `alerts?user_id=eq.${userId}&type=eq.${payload.type}&ticker=eq.${payload.ticker}&status=neq.ignorado&select=id&limit=1`,
  )
  if (!existing.ok) throw new Error('Não foi possível consultar alertas existentes.')
  if ((await existing.json()).length > 0) return false

  const created = await rest('alerts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, ...payload }),
  })
  if (created.ok) return true
  if (created.status === 409) return false
  throw new Error('Não foi possível criar o alerta.')
}

// ─── Yahoo Finance — dividendos 12 meses ─────────────────────────────────────

function needsSaSuffix(ticker: string): boolean {
  if (ticker.includes('.')) return false
  return /\d$/.test(ticker)
}

/**
 * Busca dividendos dos últimos 12 meses via Yahoo Finance.
 * Retorna array de { ticker, value_per_share } para compatibilidade com
 * findBazinAlertCandidates — que soma todos os value_per_share por ticker.
 */
async function fetchYahooDividendsForBazin(
  ticker: string,
  currency: string,
): Promise<Array<{ ticker: string; value_per_share: number }>> {
  const symbol = currency === 'USD' ? ticker : needsSaSuffix(ticker) ? `${ticker}.SA` : ticker
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?events=dividends&range=1y&interval=1d`

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
    const result: Array<{ ticker: string; value_per_share: number }> = []

    for (const entry of Object.values(raw)) {
      const amount = Number(entry.amount)
      if (!Number.isFinite(amount) || amount <= 0) continue
      result.push({ ticker, value_per_share: amount })
    }

    return result
  } catch {
    clearTimeout(timer)
    return []
  }
}

// ─── handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)

  const userId = await authenticatedUser(request)
  if (!userId) return response({ error: 'Autenticação necessária.' }, 401)

  try {
    const positionsResponse = await rest(`positions?user_id=eq.${userId}&select=ticker,assets(currency)`)
    const transactionsResponse = await rest(`transactions?user_id=eq.${userId}&select=ticker`)
    if (!positionsResponse.ok || !transactionsResponse.ok) throw new Error('Falha ao ler a carteira.')

    const positionsRaw = (await positionsResponse.json()) as Array<{
      ticker: string
      assets: { currency: string } | null
    }>
    const transactions = (await transactionsResponse.json()) as Array<{ ticker: string }>
    const positions = positionsRaw.map((p) => ({ ticker: p.ticker }))
    const currencyByTicker = new Map(positionsRaw.map((p) => [p.ticker, p.assets?.currency ?? 'BRL']))

    const quotes: Array<{ ticker: string; date: string; close: number }> = []
    let created = 0

    for (const position of positions) {
      const quoteResponse = await rest(
        `price_history?ticker=eq.${position.ticker}&select=ticker,date,close&order=date.desc&limit=1`,
      )
      if (!quoteResponse.ok) throw new Error('Falha ao ler cotações.')
      const [quote] = (await quoteResponse.json()) as Array<{ ticker: string; date: string; close: number }>
      if (quote) quotes.push(quote)
    }

    // ── Buscar dividendos via Yahoo Finance (fonte confiável) ──────────────
    // Em vez de usar a tabela dividends (dados sintéticos), buscamos direto
    // no Yahoo para cada ticker. Pausa curta entre requests para evitar rate-limit.
    const dividends: Array<{ ticker: string; value_per_share: number }> = []

    for (let i = 0; i < positions.length; i++) {
      const { ticker } = positions[i]
      const currency = currencyByTicker.get(ticker) ?? 'BRL'
      const tickerDividends = await fetchYahooDividendsForBazin(ticker, currency)
      dividends.push(...tickerDividends)
      if (i < positions.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS))
    }

    const inconsistencyCandidates = findAlertCandidates(positions, transactions, quotes)
    const bazinCandidates = findBazinAlertCandidates(positions, dividends, quotes)
    const allCandidates = [...inconsistencyCandidates, ...bazinCandidates]

    for (const candidate of allCandidates) {
      created += Number(
        await insertAlert(userId, {
          ...candidate,
          status: 'novo',
        }),
      )
    }

    return response({ created, positions: positions.length })
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Falha ao gerar alertas.' }, 500)
  }
})
