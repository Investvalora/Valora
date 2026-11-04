export interface Quote { ticker: string; date: string; close: number; source: string; market_time: string }
export interface ProviderKey { id: string; token: string; blockedUntil?: string }
interface Asset { ticker: string; currency: string }
interface Dependencies {
  keys: ProviderKey[]; now?: Date; fetch: typeof fetch
  block: (id: string, until: string, reason: string) => Promise<void>
  save: (row: Quote) => Promise<boolean>
}
function quote(ticker: string, price: unknown, time: unknown, source: string, now: Date): Quote | null {
  const stamp = typeof time === 'number' ? time * 1000 : typeof time === 'string' ? Date.parse(time) : NaN
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stamp)
    || stamp > now.getTime() + 300000 || now.getTime() - stamp > 4 * 86400000) return null
  return { ticker, date: new Date(stamp).toISOString().slice(0, 10), close: price, source, market_time: new Date(stamp).toISOString() }
}

/** Yahoo first for BR quotes only. History, dividends and fundamentals keep their own flows. */
export async function syncQuotes(assets: Asset[], deps: Dependencies) {
  const now = deps.now ?? new Date()
  const blocked = new Set(deps.keys.filter(k => Date.parse(k.blockedUntil ?? '') > now.getTime()).map(k => k.id))
  let cursor = 0, yahooRequests = 0, brapiRequests = 0, saved = 0, failed = 0, preserved = 0
  const errors: { ticker: string; reason: string }[] = []
  const deadline = Date.now() + 100000
  async function process(asset: Asset) {
    if (Date.now() > deadline || asset.currency !== 'BRL' || !/^[A-Z0-9]+$/.test(asset.ticker)) {
      failed++; errors.push({ ticker: asset.ticker, reason: Date.now() > deadline ? 'time_budget' : 'unsupported_asset' }); return
    }
    let row: Quote | null = null
    yahooRequests++
    try {
      const symbol = `${asset.ticker}.SA`
      const response = await deps.fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)' }, signal: AbortSignal.timeout(7000) })
      const data = await response.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (response.ok && !data?.chart?.error && meta?.currency === 'BRL' && meta?.symbol?.toUpperCase() === symbol) row = quote(asset.ticker, meta.regularMarketPrice, meta.regularMarketTime, 'yahoo', now)
    } catch { /* No raw provider URLs, responses or credentials in logs. */ }
    // A quote more than 36 hours old may be a holiday/weekend close; ask the
    // alternative and choose the newer timestamp, never relabel it as today.
    const oldYahoo = row
    if (!row || now.getTime() - Date.parse(row.market_time) > 36 * 3600000) {
      const start = cursor++
      for (let attempt = 0; attempt < deps.keys.length && Date.now() <= deadline; attempt++) {
        const key = deps.keys[(start + attempt) % deps.keys.length]
        if (blocked.has(key.id)) continue
        brapiRequests++
        try {
          const response = await deps.fetch(`https://brapi.dev/api/quote/${asset.ticker}`, { headers: { Authorization: `Bearer ${key.token}` }, signal: AbortSignal.timeout(7000) })
          const data = await response.json()
          if ([401,403,429].includes(response.status)) {
            blocked.add(key.id)
            const reset = Date.parse(data?.details?.usage?.resetsAt ?? '')
            const until = Number.isFinite(reset) && reset > now.getTime() && reset < now.getTime() + 35 * 86400000 ? reset : now.getTime() + (response.status === 429 ? 3600000 : 86400000)
            await deps.block(key.id, new Date(until).toISOString(), data?.code === 'MONTHLY_LIMIT_EXCEEDED' ? 'monthly_limit' : `http_${response.status}`)
            continue
          }
          const item = data?.results?.[0]
          const candidate = response.ok && !data.error && item?.symbol?.toUpperCase() === asset.ticker
            ? quote(asset.ticker, item.regularMarketPrice, item.regularMarketTime, 'brapi', now) : null
          if (candidate && (!oldYahoo || candidate.market_time > oldYahoo.market_time)) row = candidate
          if (candidate) break
        } catch { /* Try next configured key; no duplicates or historical seed. */ }
      }
    }
    if (!row) { failed++; errors.push({ ticker: asset.ticker, reason: 'no_recent_quote' }); return }
    try { if (await deps.save(row)) saved++; else preserved++ }
    catch { failed++; errors.push({ ticker: asset.ticker, reason: 'storage_unavailable' }) }
  }
  // Bounded concurrency keeps 40+ sequential timeouts below function lifetime.
  for (let index = 0; index < assets.length; index += 3) await Promise.all(assets.slice(index,index + 3).map(process))
  return { assets: assets.length, yahooRequests, brapiRequests, saved, preserved, failed, blockedKeys: blocked.size, errors }
}
