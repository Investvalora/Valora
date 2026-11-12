import { authorizeInternationalCollector } from './githubOidc.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
import { collectProviderFallbacks } from './providers.ts'
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
    if (body.mode === 'providers') return Response.json(await collectProviderFallbacks(rpc, async name => {
      const configured = Deno.env.get(name)?.trim()
      if (configured) return configured
      if (/^MARKETSTACK_API_KEY_[2-8]$/.test(name)) return ''
      const value = await rpc('get_dividend_provider_key', { p_provider: name === 'ALPHA_VANTAGE_API_KEY' ? 'alpha_vantage' : name === 'MARKETSTACK_API_KEYS' ? 'marketstack_keys' : 'marketstack' })
      return typeof value === 'string' ? value : ''
    }, new Date().toISOString().slice(0,10)))
    if (body.mode === 'claim' || body.mode === 'claim_sec') {
      const tasks = await rpc(body.mode === 'claim_sec' ? 'claim_sec_dividends' : 'claim_international_announcements', {}) as { ticker: string; claim_token: string }[]
      return Response.json({ tasks: tasks.map(t => ({ ticker: t.ticker, claim_token: t.claim_token })) })
    }
    if (!['finish','finish_sec'].includes(body.mode) || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(String(body.ticker))
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(String(body.claim_token)) || !Array.isArray(body.events) || body.events.length>100
      || (body.error !== null && !(body.mode === 'finish_sec' ? /^sec_[a-z0-9_]{1,60}$/ : /^(?:nasdaq|jpm|ma)_[a-z0-9_]{1,60}$/).test(String(body.error)))) return Response.json({ error: 'invalid_request' }, { status: 400 })
    if (body.mode === 'finish_sec') {
      if (body.events.length>4 || !Number.isInteger(body.inspected) || body.inspected<0 || body.inspected>4 || typeof body.partial!=='boolean' || (body.error===null && !/^\d{10}$/.test(String(body.cik)))) return Response.json({error:'invalid_request'},{status:400})
      return Response.json(await rpc('finish_sec_dividends',{p_ticker:body.ticker,p_claim_token:body.claim_token,p_cik:body.cik??null,p_events:body.events,p_error:body.error,p_inspected:body.inspected,p_partial:body.partial}))
    }
    const result = await rpc('finish_international_announcements', { p_ticker: body.ticker, p_claim_token: body.claim_token, p_events: body.events, p_error: body.error })
    return Response.json({ ...result, received_income_created: 0 })
  } catch { return Response.json({ error: 'collector_request_failed' }, { status: 503 }) }
})
