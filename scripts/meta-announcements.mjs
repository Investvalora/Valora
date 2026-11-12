import { metaIndex,metaUrl,metaLinks,metaAnnouncement } from '../supabase/functions/sync-international-announcements/meta.ts'
async function readPublic(url) {
  if(url!==metaIndex)metaUrl(url)
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json,text/html','User-Agent':'Valora public data collector'}})
  if(!r.ok||!r.body)throw new Error('issuer_source_unavailable')
  const reader=r.body.getReader();let size=0;const chunks=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('issuer_source_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks).toString('utf8')
}
export async function metaAnnouncements(asOf,read=readPublic) {
  const links=metaLinks(JSON.parse(await read(metaIndex)),asOf);const events=[]
  for(const link of links)events.push(metaAnnouncement(await read(link.url),link,asOf))
  if(new Set(events.map(e=>e.record_date)).size!==events.length)throw new Error('issuer_ambiguous_distribution')
  return events
}
