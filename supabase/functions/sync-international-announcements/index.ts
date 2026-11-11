import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { nasdaqIdentity, nasdaqAnnouncements } from './nasdaq.ts'
import { nasdaqSource } from './source.ts'
const url = Deno.env.get('SUPABASE_URL') ?? '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error('announcement_storage_failed')
  return r
}
Deno.serve(async request => {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  if (!await authorizeServiceJob(request, url, key)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  let processed = 0, saved = 0; const errors: { ticker: string; code: string }[] = []
  try {
    const tasks = await (await rest('rpc/claim_international_announcements', { method: 'POST', body: '{}' })).json() as { ticker: string }[]
    for (const { ticker } of tasks) {
      let failure: string | null = null
      try {
        if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error('nasdaq_identity_unsupported')
        nasdaqIdentity(await nasdaqSource(ticker, 'info'), ticker)
        const events = nasdaqAnnouncements(await nasdaqSource(ticker, 'dividends'), new Date().toISOString().slice(0,10))
        const result = await (await rest('rpc/store_international_announcements', { method: 'POST', body: JSON.stringify({ p_ticker: ticker, p_events: events }) })).json()
        saved += result.saved
        if (result.conflicts) throw new Error('nasdaq_event_conflict')
        processed++
      } catch (e) {
        const message = e instanceof Error ? e.message : ''
        failure = /^(nasdaq_[a-z_]+|nasdaq_http_\d{3}|announcement_storage_failed)$/.test(message) ? message : 'nasdaq_source_unavailable'
        errors.push({ ticker, code: failure })
      }
      // Unsupported/no distribution: one probe daily. Transient errors back off.
      const hours = failure === null ? 12 : ['nasdaq_identity_unsupported','nasdaq_unavailable'].includes(failure) ? 24 : 2
      await rest(`international_announcement_tasks?ticker=eq.${encodeURIComponent(ticker)}`, { method: 'PATCH', body: JSON.stringify({ next_sync_at: new Date(Date.now()+hours*3600000).toISOString(), last_attempt_at: new Date().toISOString(), last_error: failure, ...(failure === null ? { last_success_at: new Date().toISOString() } : {}) }) })
    }
    return Response.json({ processed, saved, errors, received_income_created: 0 }, { status: errors.length ? 503 : 200 })
  } catch { return Response.json({ error: 'announcement_sync_incomplete', processed, saved }, { status: 503 }) }
})
