import { jpmorganAnnouncements } from './jpmorgan-announcements.mjs'
import { pathToFileURL } from 'node:url'
import { nasdaqSource } from '../supabase/functions/sync-international-announcements/source.ts'
import { nasdaqIdentity, nasdaqAnnouncements } from '../supabase/functions/sync-international-announcements/nasdaq.ts'

export async function collectAnnouncements({ endpoint, token, probeOnly = false, source = nasdaqSource, request = fetch, issuerSource = jpmorganAnnouncements }) {
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
      if (task.ticker === 'JPM') events = await issuerSource(asOf)
      else {
        nasdaqIdentity(await source(task.ticker, 'info'), task.ticker)
        events = nasdaqAnnouncements(await source(task.ticker, 'dividends'), asOf)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      error = /^(?:nasdaq|jpm)_[a-z0-9_]{1,60}$/.test(message) ? message : (task.ticker === 'JPM' ? 'jpm_source_unavailable' : 'nasdaq_source_unavailable')
    }
    const stored = probeOnly ? {} : await call({ mode: 'finish', ticker: task.ticker, claim_token: task.claim_token, events, error })
    results.push({ ticker: task.ticker, events: events.length, error, ...stored })
  }
  const unsupported = results.filter(r => ['nasdaq_identity_unsupported','nasdaq_unavailable'].includes(r.error)).length
  return { probeOnly, results, unsupported, failed: results.filter(r => probeOnly
    ? r.error !== null || r.events === 0
    : (r.error !== null && !['nasdaq_identity_unsupported','nasdaq_unavailable'].includes(r.error)) || Number(r.conflicts)>0).length }
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
    const result = await collectAnnouncements({ endpoint, token: probeOnly ? undefined : await githubIdentity(endpoint), probeOnly })
    console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1
  } catch { console.error('international_collector_failed'); process.exitCode = 1 }
}
