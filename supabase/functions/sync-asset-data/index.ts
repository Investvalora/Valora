import { yahooCaller } from '../_shared/yahooAuthorization.ts'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const rest = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('database_unavailable')
  return response
}

type Asset = { ticker: string; type: string; currency: string }
type Chart = { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] }; events?: { dividends?: Record<string, { date: number; amount: number }> } }

export function yahooSymbol(asset: Asset) {
  if (asset.type === 'crypto') return asset.ticker.endsWith('-BRL') ? asset.ticker : `${asset.ticker}-USD`
  return asset.currency === 'BRL' && /\d$/.test(asset.ticker) ? `${asset.ticker}.SA` : asset.ticker.replace('.', '-')
}

export function chartRows(asset: Asset, chart: Chart, today: string) {
  const prices = (chart.timestamp ?? []).flatMap((time, index) => {
    const close = chart.indicators?.quote?.[0]?.close?.[index]
    const date = new Date(time * 1000).toISOString().slice(0, 10)
    return typeof close === 'number' && Number.isFinite(close) && close > 0 && date <= today
      ? [{ ticker: asset.ticker, date, close, source: 'yahoo' }] : []
  })
  // Yahoo supplies ex dates, not payment dates. Never invent payment dates.
  const dividends = Object.values(chart.events?.dividends ?? {}).flatMap(event => {
    const date = new Date(event.date * 1000).toISOString().slice(0, 10)
    return Number.isFinite(event.amount) && event.amount > 0 && date <= today && asset.type !== 'crypto'
      ? [{ ticker: asset.ticker, ex_date: date, value_per_share: event.amount, type: 'dividend', source: 'yahoo' }] : []
  })
  return { prices, dividends }
}

async function insertMissing(table: string, conflict: string, rows: unknown[]) {
  for (let i = 0; i < rows.length; i += 500) await rest(`${table}?on_conflict=${conflict}`, {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 500)),
  })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const caller = await yahooCaller(request, url, key)
  if (caller.kind === 'denied') return json({ error: 'unauthorized' }, caller.status)
  let ticker: string
  try {
    const body = await request.json()
    if (typeof body.ticker !== 'string' || !/^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(body.ticker.trim().toUpperCase())) return json({ error: 'invalid_ticker' }, 400)
    ticker = body.ticker.trim().toUpperCase()
  } catch { return json({ error: 'invalid_body' }, 400) }
  try {
    if (caller.kind === 'user') {
      const positions = await (await rest(`positions?user_id=eq.${encodeURIComponent(caller.userId)}&ticker=eq.${encodeURIComponent(ticker)}&select=ticker&limit=1`)).json()
      if (!positions.length) return json({ error: 'asset_not_owned' }, 403)
    }
    const assets = await (await rest(`assets?ticker=eq.${encodeURIComponent(ticker)}&active=eq.true&select=ticker,type,currency&limit=1`)).json() as Asset[]
    const asset = assets[0]
    if (!asset) return json({ error: 'asset_not_found' }, 404)
    const today = new Date().toISOString().slice(0, 10)
    let prices = 'unavailable', dividends = asset.type === 'crypto' ? 'not_applicable' : 'unavailable'
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(asset))}?range=5y&interval=1d&events=dividends`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)' }, signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error('provider_unavailable')
      const data = await response.json()
      const chart = data.chart?.result?.[0] as Chart | undefined
      if (!chart || data.chart?.error) throw new Error('provider_unavailable')
      const rows = chartRows(asset, chart, today)
      if (rows.prices.length) {
        await insertMissing('price_history', 'ticker,date', rows.prices)
        prices = 'updated'
      }
      if (asset.type !== 'crypto') {
        const existing = await (await rest(`dividends?ticker=eq.${encodeURIComponent(ticker)}&select=ex_date&limit=5000`)).json() as { ex_date: string }[]
        const knownDates = new Set(existing.map(row => row.ex_date))
        // Yahoo aggregates cash events and does not identify Brazilian JCP.
        // Preserve dates already covered by another source instead of counting twice.
        await insertMissing('dividends', 'ticker,ex_date,type', rows.dividends.filter(row => !knownDates.has(row.ex_date)))
        dividends = rows.dividends.length ? 'updated' : 'no_events'
      }
    } catch { /* Preserve existing data and report partial availability. */ }
    let fundamentals = ['crypto', 'etf_us', 'etf_br'].includes(asset.type) ? 'not_applicable' : 'unavailable'
    if (fundamentals !== 'not_applicable') {
      const existing = await (await rest(`fundamentals?ticker=eq.${encodeURIComponent(ticker)}&reference_date=gte.${today}&select=ticker&limit=1`)).json()
      if (existing.length) fundamentals = 'cached'
      else {
        try {
          const response = await fetch(`${url}/functions/v1/sync-yahoo-fundamentals`, {
            method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: [ticker] }), signal: AbortSignal.timeout(30000),
          })
          const result = response.ok ? await response.json() : null
          if (result?.gravados > 0) fundamentals = 'updated'
        } catch { /* A source failure must not undo a successful purchase. */ }
      }
    }
    return json({ ticker, prices, dividends, fundamentals })
  } catch { return json({ error: 'sync_unavailable' }, 503) }
})
