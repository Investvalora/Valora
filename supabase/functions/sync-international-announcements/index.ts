import { authorizeInternationalCollector } from './githubOidc.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
const url = Deno.env.get('SUPABASE_URL') ?? '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
async function rpc(name: string, body: unknown) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error('collector_storage_failed')
  return r.json()
}
Deno.serve(async request => {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  if (!await authorizeInternationalCollector(request, url, key)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const body = JSON.parse(new TextDecoder().decode(await boundedBytes(new Response(request.body), 64*1024)))
    if (body.mode === 'claim') {
      const tasks = await rpc('claim_international_announcements', {}) as { ticker: string; claim_token: string }[]
      return Response.json({ tasks: tasks.map(t => ({ ticker: t.ticker, claim_token: t.claim_token })) })
    }
    if (body.mode !== 'finish' || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(String(body.ticker))
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(String(body.claim_token)) || !Array.isArray(body.events) || body.events.length>100
      || (body.error !== null && !/^(?:nasdaq|jpm)_[a-z0-9_]{1,60}$/.test(String(body.error)))) return Response.json({ error: 'invalid_request' }, { status: 400 })
    const result = await rpc('finish_international_announcements', { p_ticker: body.ticker, p_claim_token: body.claim_token, p_events: body.events, p_error: body.error })
    return Response.json({ ...result, received_income_created: 0 })
  } catch { return Response.json({ error: 'collector_request_failed' }, { status: 503 }) }
})
