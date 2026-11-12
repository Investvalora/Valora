import { maReleaseUrl,maReleaseLinks,maAnnouncement } from '../supabase/functions/sync-international-announcements/mastercard.ts'
export const maIndex='https://www.nasdaq.com/api/news/topic/press_release?q=symbol:MA|assetclass:stocks&limit=100&offset=0'
async function publicText(url){
  const u=new URL(url)
  if(url!==maIndex && maReleaseUrl(u.pathname)!==url)throw new Error('ma_invalid_source')
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json,text/html'}})
  if(!r.ok)throw new Error(`ma_http_${r.status}`)
  const reader=r.body?.getReader();if(!reader)throw new Error('ma_source_unavailable')
  const chunks=[];let size=0
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('ma_response_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return new TextDecoder().decode(bytes)
}
export async function mastercardAnnouncements(asOf,read=publicText){
  const links=maReleaseLinks(JSON.parse(await read(maIndex)),asOf)
  if(!links.length)throw new Error('ma_discovery_window_empty')
  const events=[];for(const link of links)events.push(maAnnouncement(await read(link.source_url),link,asOf))
  if(new Set(events.map(x=>x.record_date)).size!==events.length)throw new Error('ma_ambiguous_distribution')
  return events
}
