import { jpmorganAnnouncements } from './jpmorgan-announcements.mjs'
import { mastercardAnnouncements } from './mastercard-announcements.mjs'
import { collectSecDividends } from './sec-dividend-announcements.mjs'
import { pathToFileURL } from 'node:url'
import { nasdaqSource } from '../supabase/functions/sync-international-announcements/source.ts'
import { nasdaqIdentity, nasdaqAnnouncements } from '../supabase/functions/sync-international-announcements/nasdaq.ts'
import { providerOperationalFailure } from '../supabase/functions/sync-international-announcements/providers.ts'
import { permrockAnnouncements } from './permrock-announcements.mjs'
import { blackrockAnnouncements } from './blackrock-announcements.mjs'
import { metaAnnouncements } from './meta-announcements.mjs'

export async function collectAnnouncements({ endpoint, token, probeOnly = false, source = nasdaqSource, request = fetch, issuerSource = jpmorganAnnouncements, maSource = mastercardAnnouncements, primarySources = { PRT: permrockAnnouncements, META: metaAnnouncements, BMN: blackrockAnnouncements } }) {
  const asOf = new Date().toISOString().slice(0,10)
  if (!probeOnly && (endpoint !== 'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements' || !token)) throw new Error('collector_configuration_missing')
  async function call(body) {
    const r = await request(endpoint, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
    if (!r.ok) throw new Error(`collector_http_${r.status}`)
    return r.json()
  }
  const tasks = probeOnly ? [{ ticker: 'AAPL' }, { ticker: 'COST' }] : (await call({ mode: 'claim' })).tasks
  if (!Array.isArray(tasks) || tasks.length>2) throw new Error('invalid_collector_batch')
  const results = []
  for (const task of tasks) {
    let events = [], error = null
    try {
      if (primarySources[task.ticker]) events = await primarySources[task.ticker](asOf)
      else if (task.ticker === 'JPM') events = await issuerSource(asOf)
      else if (task.ticker === 'MA') events = await maSource(asOf)
      else {
        nasdaqIdentity(await source(task.ticker, 'info'), task.ticker)
        events = nasdaqAnnouncements(await source(task.ticker, 'dividends'), asOf)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      error = /^(?:nasdaq|jpm|ma|issuer)_[a-z0-9_]{1,60}$/.test(message) ? message : (primarySources[task.ticker]?'issuer_source_unavailable':task.ticker === 'JPM' ? 'jpm_source_unavailable' : task.ticker==='MA'?'ma_source_unavailable':'nasdaq_source_unavailable')
    }
    const stored = probeOnly ? {} : await call({ mode: primarySources[task.ticker]?'finish_primary':'finish', ticker: task.ticker, claim_token: task.claim_token, events, error })
    results.push({ ticker: task.ticker, events: events.length, error, ...stored })
  }
  const unsupported = results.filter(r => ['nasdaq_identity_unsupported','nasdaq_unavailable'].includes(r.error)).length
  return { probeOnly, results, unsupported, failed: results.filter(r => probeOnly
    ? r.error !== null || r.events === 0
    : (r.error !== null && !['nasdaq_identity_unsupported','nasdaq_unavailable','issuer_ex_unconfirmed'].includes(r.error)) || Number(r.conflicts)>0).length }
}
async function githubIdentity(endpoint) {
  const target = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL ?? '')
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.actions.githubusercontent.com') || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error('github_identity_unavailable')
  target.searchParams.set('audience', endpoint)
  const r = await fetch(target, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error('github_identity_unavailable')
  const { value } = await r.json()
  if (typeof value !== 'string' || value.length>16000) throw new Error('github_identity_unavailable')
  process.stdout.write(`::add-mask::${value}\n`)
  return value
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const probeOnly = process.env.INTERNATIONAL_PROBE_ONLY === 'true'
    const endpoint = 'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements'
    const token=probeOnly?undefined:await githubIdentity(endpoint)
    try {
      const result = await collectAnnouncements({ endpoint, token, probeOnly })
      console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1
    } catch {console.error('international_primary_collector_failed');process.exitCode=1}
    if(!probeOnly){
      try {const sec=await collectSecDividends({endpoint,token});console.log(JSON.stringify(sec));if(sec.failed)process.exitCode=1}
      catch {console.error('sec_collector_failed');process.exitCode=1}
      const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mode:'providers'}),signal:AbortSignal.timeout(60000)})
      if(!r.ok)throw new Error('provider_collection_failed')
      const result=await r.json();console.log(JSON.stringify({providers:result}));if(result.results?.some(r=>providerOperationalFailure(r.error)))process.exitCode=1
      const health=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mode:'health'}),signal:AbortSignal.timeout(20000)})
      if(!health.ok)throw new Error('collector_health_failed')
      console.log(JSON.stringify({health:await health.json()}))
    }
  } catch { console.error('international_collector_failed'); process.exitCode = 1 }
}
