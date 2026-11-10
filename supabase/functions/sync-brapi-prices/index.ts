import { yahooCaller } from '../_shared/yahooAuthorization.ts'
import { syncQuotes } from './sync.ts'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const tokens = [...new Set([
  ...(Deno.env.get('BRAPI_API_KEYS') ?? '').split(/[\s,;]+/),
  Deno.env.get('BRAPI_API_KEY') ?? '', Deno.env.get('BRAPI_KEY') ?? '',
  ...Array.from({ length: 7 }, (_, index) => Deno.env.get(`BRAPI_API_KEY_${index + 2}`) ?? ''),
].map(value => value.trim()).filter(Boolean))].slice(0,8)
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('database_unavailable')
  return response
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const caller = await yahooCaller(request, url, key)
  if (caller.kind !== 'service') return json({ error: 'unauthorized' }, caller.kind === 'denied' ? caller.status : 403)
  try {
    const body = await request.json().catch(() => ({}))
    const diagnostic = body?.diagnostic === 'validate_brapi_keys'
    const assets = []
    for (let offset = 0; ; offset += 500) {
      const page = await (await rest(`assets?select=ticker,currency&active=eq.true&type=in.(stock_br,fii,bdr,etf_br)&order=ticker&offset=${offset}&limit=500`)).json()
      assets.push(...page)
      if (page.length < 500) break
    }
    const state = await (await rest('market_provider_state?select=provider,blocked_until')).json()
    const keys = await Promise.all(tokens.map(async token => {
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))), value => value.toString(16).padStart(2,'0')).join('')
      const id = `brapi:${digest}`
      return { id, token, blockedUntil: state.find((row: { provider: string }) => row.provider === id)?.blocked_until }
    }))
    const result = await syncQuotes(diagnostic ? assets.slice(0, Math.min(keys.length, 8)) : assets, {
      keys, fetch, brapiOnly: diagnostic,
      block: async (id, until, reason) => {
        await rest('market_provider_state?on_conflict=provider', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ provider: id, blocked_until: until, reason }) })
      },
      save: async row => {
        if (diagnostic) return false
        return await (await rest('rpc/store_market_quote', { method: 'POST', body: JSON.stringify({ p_ticker: row.ticker, p_date: row.date, p_close: row.close, p_source: row.source, p_market_time: row.market_time }) })).json()
      },
    })
    return json({ ...result, configuredKeys: keys.length, diagnostic }, result.failed || (diagnostic && !keys.length) ? 503 : 200)
  } catch { return json({ error: 'sync_unavailable' }, 503) }
})
