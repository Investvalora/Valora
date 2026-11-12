import { boundedBytes } from '../_shared/officialFiles.ts'

export type DividendProvider = 'alpha_vantage' | 'marketstack'
/** Coverage gaps stay recorded on the task, but are not infrastructure failures. */
export function providerOperationalFailure(error: string | null): boolean {
  return !!error && !['provider_calendar_unavailable', 'provider_precision_limited', 'provider_precision_unavailable', 'provider_keys_unavailable', 'provider_quota_exhausted'].includes(error)
}
export interface ProviderEvent {
  ex_date: string; declaration_date: string; record_date: string; payment_date: string; value_per_share: number
}
function day(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(value)) return null
  const d = value.slice(0, 10)
  return Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d ? d : null
}
/** Partial calendars are not entitlement evidence; never substitute record for ex. */
export function providerEvents(provider: DividendProvider, ticker: string, payload: unknown, today: string): ProviderEvent[] {
  const p = payload as Record<string, unknown>
  if (!p || p.Information || p.Note || p['Error Message'] || p.error) throw new Error('provider_rejected')
  if (provider === 'alpha_vantage' && p.symbol !== ticker) throw new Error('provider_identity_changed')
  if (!Array.isArray(p.data) || p.data.length > 1000) throw new Error('provider_invalid_response')
  if (provider === 'marketstack') {
    const pagination = p.pagination as { total?: number; count?: number } | undefined
    if (!pagination || pagination.count !== p.data.length || !Number.isInteger(pagination.total) || Number(pagination.total) > p.data.length) throw new Error('provider_truncated')
  }
  const events: ProviderEvent[] = []
  for (const row of p.data as Record<string, unknown>[]) {
    if (provider === 'marketstack' && row.symbol !== ticker) throw new Error('provider_identity_changed')
    const ex = day(provider === 'alpha_vantage' ? row.ex_dividend_date : row.date)
    const declared = day(row.declaration_date), rec = day(row.record_date), pay = day(row.payment_date)
    if (!ex || !declared || !rec || !pay) continue
    if (Math.abs(Date.parse(ex) - Date.parse(today)) > 366 * 86400000) continue
    const raw = provider === 'alpha_vantage' ? row.amount : row.dividend
    if (!['number','string'].includes(typeof raw) || !/^\d+(?:\.\d{1,8})?$/.test(String(raw))) throw new Error('provider_invalid_amount')
    const amount = Number(raw)
    if(provider==='marketstack'&&amount===0)throw new Error('provider_precision_unavailable')
    if (!(amount > 0 && amount < 1e12)) throw new Error('provider_invalid_amount')
    const [whole, fraction = ''] = String(raw).split('.')
    const exact = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'))
    if (BigInt(amount.toFixed(8).replace('.', '')) !== exact) throw new Error('provider_invalid_amount')
    if (declared > today || declared > ex || ex > rec || rec > pay || Date.parse(pay) - Date.parse(ex) > 366 * 86400000) throw new Error('provider_invalid_calendar')
    if (events.some(e => e.ex_date === ex)) throw new Error('provider_ambiguous_distribution')
    events.push({ ex_date: ex, declaration_date: declared, record_date: rec, payment_date: pay, value_per_share: amount })
  }
  if (!events.length) throw new Error('provider_calendar_unavailable')
  return events
}

export async function fetchProviderEvents(provider: DividendProvider, ticker: string, key: string, today: string, request = fetch): Promise<ProviderEvent[]> {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || !key.trim()) throw new Error('provider_configuration_missing')
  const endpoint = new URL(provider === 'alpha_vantage' ? 'https://www.alphavantage.co/query' : 'https://api.marketstack.com/v2/dividends')
  if (provider === 'alpha_vantage') {
    endpoint.search = new URLSearchParams({ function: 'DIVIDENDS', symbol: ticker, apikey: key }).toString()
  } else {
    const since = new Date(Date.parse(today) - 365 * 86400000).toISOString().slice(0,10)
    endpoint.search = new URLSearchParams({ access_key: key, symbols: ticker, date_from: since, limit: '100' }).toString()
  }
  try {
    const r = await request(endpoint, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } })
    const payload = JSON.parse(new TextDecoder().decode(await boundedBytes(new Response(r.body), 1024 * 1024)))
    if (provider === 'marketstack') {
      const code = payload?.error?.code
      if (['usage_limit_reached','monthly_limit_reached'].includes(code)) throw new Error('provider_quota_exhausted')
      if (['invalid_access_key','missing_access_key','inactive_user'].includes(code)) throw new Error('provider_key_invalid')
      if (r.status === 429 || code === 'rate_limit_reached') throw new Error('provider_rate_limited')
    }
    if (!r.ok) throw new Error('provider_rejected')
    return providerEvents(provider, ticker, payload, today)
  } catch (e) {
    // Native fetch errors and vendor bodies may include the credential-bearing URL.
    if (e instanceof Error && /^provider_[a-z_]+$/.test(e.message)) throw e
    throw new Error('provider_request_failed')
  }
}

type Rpc = (name: string, body: unknown) => Promise<unknown>
/** One key per independently quota'd account; duplicates never multiply quota. */
export function marketstackKeys(list: string, primary: string, numbered: string[]): string[] {
  return [...new Set([primary, ...list.split(/[\s,;]+/), ...numbered].map(k => k.trim()).filter(Boolean))].slice(0,8)
}
async function keyEntries(keys: string[]) {
  return Promise.all(keys.map(async key => ({ key, id: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))).map(b=>b.toString(16).padStart(2,'0')).join('') })))
}
export async function rotatingMarketstack(rpc: Rpc, keys: string[], ticker: string, today: string, request = fetch): Promise<ProviderEvent[]> {
  const entries = await keyEntries(keys)
  let lastError = 'provider_keys_unavailable'
  for (let attempt=0; attempt<entries.length; attempt++) {
    const id = await rpc('reserve_marketstack_key', { p_key_ids: entries.map(e=>e.id) })
    const entry = entries.find(e=>e.id===id)
    if (!entry) throw new Error(lastError)
    try { return await fetchProviderEvents('marketstack',ticker,entry.key,today,request) }
    catch (e) {
      lastError = e instanceof Error && /^provider_[a-z_]+$/.test(e.message) ? e.message : 'provider_request_failed'
      if (!['provider_quota_exhausted','provider_key_invalid','provider_rate_limited'].includes(lastError)) throw new Error(lastError)
      await rpc('block_marketstack_key', { p_key_id: entry.id, p_reason: lastError })
    }
  }
  throw new Error(lastError)
}
/** Secrets stay at the Edge. Reservations consume quota before network I/O. */
export async function collectProviderFallbacks(rpc: Rpc, secret: (name: string) => string | Promise<string>, today: string) {
  const results: { provider: DividendProvider; ticker: string; events: number; error: string | null }[] = []
  const skipped: {provider:DividendProvider;reason:'provider_key_missing'|'provider_key_budget_exhausted'|'provider_no_due_task_or_global_budget'}[]=[]
  for (const provider of ['alpha_vantage','marketstack'] as const) {
    const key = await secret(provider === 'alpha_vantage' ? 'ALPHA_VANTAGE_API_KEY' : 'MARKETSTACK_API_KEY')
    const keys = provider === 'marketstack' ? marketstackKeys(await secret('MARKETSTACK_API_KEYS'),key,await Promise.all(Array.from({length:7},(_,i)=>secret(`MARKETSTACK_API_KEY_${i+2}`)))) : []
    if (provider === 'marketstack' ? !keys.length : !key) {skipped.push({provider,reason:'provider_key_missing'});continue}
    // Avoid leasing/defering an asset when every account is already out of budget.
    // This is a preflight only; the atomic reservation remains mandatory before HTTP.
    if (provider === 'marketstack' && await rpc('marketstack_budget_available', {p_key_ids:(await keyEntries(keys)).map(k=>k.id)}) !== true) {skipped.push({provider,reason:'provider_key_budget_exhausted'});continue}
    const tasks = await rpc('claim_dividend_provider', { p_provider: provider }) as { ticker: string; claim_token: string }[]
    if (!Array.isArray(tasks) || tasks.length > 1) throw new Error('provider_invalid_task')
    if(!tasks.length)skipped.push({provider,reason:'provider_no_due_task_or_global_budget'})
    for (const task of tasks) {
      let events: ProviderEvent[] = [], error: string | null = null
      try { events = provider === 'marketstack' ? await rotatingMarketstack(rpc,keys,task.ticker,today) : await fetchProviderEvents(provider, task.ticker, key, today) }
      catch (e) { error = e instanceof Error && /^provider_[a-z_]+$/.test(e.message) ? e.message : 'provider_request_failed' }
      const stored = await rpc('finish_dividend_provider', { p_provider: provider, p_ticker: task.ticker, p_claim_token: task.claim_token, p_events: events, p_error: error }) as { error?: unknown } | null
      if (stored?.error) {
        if (typeof stored.error !== 'string' || !/^provider_[a-z_]+$/.test(stored.error)) throw new Error('provider_storage_failed')
        error = stored.error
      }
      results.push({ provider, ticker: task.ticker, events: events.length, error })
    }
  }
  return { results, skipped, received_income_created: 0 }
}
