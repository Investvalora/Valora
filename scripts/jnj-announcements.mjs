import { jnjIndex, jnjUrl, jnjLinks, jnjAnnouncement } from '../supabase/functions/sync-international-announcements/jnj.ts'
async function readPublic(url) {
  if (url !== jnjIndex) jnjUrl(url)
  const r = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json,text/html', 'User-Agent': 'Valora public data collector' } })
  if (!r.ok || !r.body) throw new Error('issuer_source_unavailable')
  const reader = r.body.getReader(); let size = 0; const chunks = []
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2*1024*1024) throw new Error('issuer_source_too_large'); chunks.push(value) } } finally { await reader.cancel().catch(()=>{}) }
  return Buffer.concat(chunks).toString('utf8')
}
export async function jnjAnnouncements(asOf, read = readPublic) {
  const events = []
  for (const link of jnjLinks(JSON.parse(await read(jnjIndex)), asOf)) events.push(jnjAnnouncement(await read(link.url), link, asOf))
  if (new Set(events.map(e=>e.ex_date)).size !== events.length) throw new Error('issuer_ambiguous_distribution')
  return events
}
