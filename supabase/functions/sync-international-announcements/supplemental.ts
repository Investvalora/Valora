import { boundedBytes, validIso } from '../_shared/officialFiles.ts'
export type SupplementalProvider = 'massive' | 'alpaca'
export function supplementalOperationalFailure(error:unknown): boolean {
  return typeof error==='string' && !['supplemental_incomplete','supplemental_truncated','supplemental_calendar_unavailable','supplemental_rate_limited','supplemental_access_denied'].includes(error)
}
export interface SupplementalEvent {
  event_id: string; ticker: string; ex_date: string | null; record_date: string | null; payment_date: string | null
  declaration_date: string | null; currency: string | null; value_per_share: string; distribution: string
}
function day(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !validIso(value)) throw new Error('supplemental_invalid_date')
  return value
}
export function supplementalEvents(provider: SupplementalProvider, ticker: string, payload: unknown, today: string) {
  const p = payload as Record<string, unknown>
  if (!validIso(today) || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || !p || typeof p !== 'object') throw new Error('supplemental_invalid_response')
  if (provider === 'massive' && p.status !== 'OK') throw new Error('supplemental_rejected')
  const container = p.corporate_actions as Record<string, unknown> | undefined
  const rows = provider === 'massive' ? p.results : container?.cash_dividends
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('supplemental_invalid_response')
  const events: SupplementalEvent[] = [], ids = new Set<string>()
  for (const raw of rows) {
    const r = raw as Record<string, unknown>
    if (!r || (provider === 'massive' ? r.ticker : r.symbol) !== ticker) throw new Error('supplemental_identity_changed')
    if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,180}$/.test(r.id) || ids.has(r.id)) throw new Error('supplemental_invalid_id')
    ids.add(r.id)
    const value = provider === 'massive' ? r.cash_amount : r.rate
    if (!['number','string'].includes(typeof value) || !/^\d+(?:\.\d{1,8})?$/.test(String(value)) || Number(value) <= 0 || Number(value) >= 1e12) throw new Error('supplemental_invalid_amount')
    const ex_date = day(provider === 'massive' ? r.ex_dividend_date : r.ex_date)
    const record_date = day(r.record_date), payment_date = day(provider === 'massive' ? r.pay_date : r.payable_date)
    // Alpaca process_date is NOT declaration_date. Missing currency stays unknown.
    const declaration_date = day(r.declaration_date)
    const distribution = provider === 'massive' ? r.distribution_type : r.special === true ? 'special' : r.special === false ? 'recurring' : 'unknown'
    if (!['recurring','special','supplemental','irregular','unknown'].includes(String(distribution))) throw new Error('supplemental_invalid_distribution')
    if (r.currency != null && (typeof r.currency !== 'string' || !/^[A-Z]{3}$/.test(r.currency))) throw new Error('supplemental_invalid_currency')
    if ((declaration_date && declaration_date > today) || (ex_date && declaration_date && declaration_date > ex_date) || (distribution === 'recurring' && ex_date && record_date && ex_date > record_date) || (payment_date && record_date && record_date > payment_date)) throw new Error('supplemental_invalid_calendar')
    if (ex_date && Math.abs(Date.parse(ex_date)-Date.parse(today)) > 366*86400000) continue
    events.push({ event_id:r.id, ticker, ex_date, record_date, payment_date, declaration_date, currency:typeof r.currency === 'string' ? r.currency : null, value_per_share:String(value), distribution:String(distribution) })
  }
  return { events, truncated:provider === 'massive' ? !!p.next_url : !!p.next_page_token }
}
export async function fetchSupplemental(provider: SupplementalProvider, ticker: string, credentials: { key: string; secret?: string }, today: string, request = fetch) {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || !validIso(today) || !credentials.key || (provider === 'alpaca' && !credentials.secret)) throw new Error('supplemental_configuration_missing')
  const start = new Date(Date.parse(today)-365*86400000).toISOString().slice(0,10)
  const end = new Date(Date.parse(today)+365*86400000).toISOString().slice(0,10)
  const url = new URL(provider === 'massive' ? 'https://api.massive.com/stocks/v1/dividends' : 'https://data.alpaca.markets/v1/corporate-actions')
  url.search = new URLSearchParams(provider === 'massive' ? { ticker, 'ex_dividend_date.gte':start, 'ex_dividend_date.lte':end, limit:'100', sort:'ex_dividend_date.desc' } : { symbols:ticker, types:'cash_dividend', start, end, limit:'100', data_quality:'all' }).toString()
  const headers: Record<string,string> = { Accept:'application/json' }
  if (provider === 'massive') headers.Authorization = `Bearer ${credentials.key}`
  else { headers['APCA-API-KEY-ID']=credentials.key; headers['APCA-API-SECRET-KEY']=credentials.secret! }
  try {
    const r = await request(url, { method:'GET', headers, redirect:'error', signal:AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(r.status === 429 ? 'supplemental_rate_limited' : r.status === 401 ? 'supplemental_credentials_rejected' : r.status === 403 ? 'supplemental_access_denied' : 'supplemental_source_unavailable')
    return supplementalEvents(provider,ticker,JSON.parse(new TextDecoder().decode(await boundedBytes(new Response(r.body),1024*1024))),today)
  } catch(e) {
    if (e instanceof Error && /^supplemental_[a-z_]+$/.test(e.message)) throw e
    throw new Error('supplemental_source_unavailable')
  }
}
export async function collectSupplemental(rpc: (name:string,body:unknown)=>Promise<unknown>, secret:(name:string)=>Promise<string>, today:string, request=fetch) {
  const results=[]
  for (const provider of ['massive','alpaca'] as const) {
    const key=await secret(provider==='massive'?'MASSIVE_API_KEY':'ALPACA_API_KEY')
    const privateKey=provider==='alpaca'?await secret('ALPACA_API_SECRET'):undefined
    if (!key || (provider==='alpaca' && !privateKey)) {results.push({provider,skipped:'credentials_missing'});continue}
    const tasks=await rpc('claim_supplemental_dividends',{p_provider:provider}) as {ticker:string;claim_token:string}[]
    if(!Array.isArray(tasks)||tasks.length>1)throw new Error('supplemental_invalid_batch')
    if(!tasks.length){results.push({provider,skipped:'budget_or_no_due_task'});continue}
    for(const task of tasks){
      let events:SupplementalEvent[]=[], error:string|null=null, partial=false
      try {const data=await fetchSupplemental(provider,task.ticker,{key,secret:privateKey},today,request);events=data.events;partial=data.truncated}
      catch(e){error=e instanceof Error?e.message:'supplemental_source_unavailable'}
      const stored=await rpc('finish_supplemental_dividends',{p_provider:provider,p_ticker:task.ticker,p_claim_token:task.claim_token,p_events:events,p_error:error,p_partial:partial})
      results.push({provider,ticker:task.ticker,...stored as object})
    }
  }
  return {results,received_income_created:0}
}
