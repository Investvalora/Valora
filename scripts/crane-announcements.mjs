import { craneIndex,craneUrl,craneLinks,craneAnnouncement } from '../supabase/functions/sync-international-announcements/crane.ts'
async function readPublic(url) {
  if(url!==craneIndex)craneUrl(url)
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json,text/html','User-Agent':'Valora public data collector'}})
  if(!r.ok||!r.body)throw new Error('issuer_source_unavailable')
  const reader=r.body.getReader();let size=0;const chunks=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('issuer_source_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks).toString('utf8')
}
export async function craneAnnouncements(asOf,read=readPublic) {
  const links=craneLinks(JSON.parse(await read(craneIndex)),asOf);const events=[]
  for(const link of links){const event=craneAnnouncement(await read(link.url),link,asOf);if(Date.parse(event.record_date)>=Date.parse(asOf)-366*86400000)events.push(event)}
  if(new Set(events.map(e=>e.record_date)).size!==events.length)throw new Error('issuer_ambiguous_distribution')
  return events
}
