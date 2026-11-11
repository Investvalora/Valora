import { jpmOrigin, jpmReleaseLinks, jpmAnnouncement } from '../supabase/functions/sync-international-announcements/jpmorgan.ts'

async function publicResponse(url) {
  const u = new URL(url)
  if (u.origin!==jpmOrigin || (!u.pathname.startsWith('/services/json/v1/dynamic-grid.service/') && !u.pathname.startsWith('/ir/news/'))) throw new Error('jpm_invalid_source')
  const r = await fetch(url, {redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json, text/html'}})
  if (!r.ok) throw new Error(`jpm_http_${r.status}`)
  const reader=r.body?.getReader();if(!reader) throw new Error('jpm_source_unavailable')
  const chunks=[];let size=0
  try { for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('jpm_response_too_large');chunks.push(value)} }
  finally {await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return new TextDecoder().decode(bytes)
}
/** Bounded discovery of recent releases, never guessed quarterly URLs. */
export async function jpmorganAnnouncements(asOf, read=publicResponse) {
  const links=new Map()
  for(let page=1;page<=4;page++) {
    const index=`${jpmOrigin}/services/json/v1/dynamic-grid.service/parent=jpmorganchase/global/US/en/home/ir/news&comp=root/content-parsys/dynamic_grid&page=p${page}.json`
    const listing=jpmReleaseLinks(JSON.parse(await read(index)),asOf)
    for(const link of listing.links)links.set(link.url,link)
    if(links.size>=2 || page*listing.pageSize>=listing.total)break
  }
  if(!links.size)throw new Error('jpm_discovery_window_empty')
  const selected=[...links.values()].sort((a,b)=>b.declaration_date.localeCompare(a.declaration_date)).slice(0,2)
  const events=[]
  for(const link of selected)events.push(jpmAnnouncement(await read(link.url),link,asOf))
  if(new Set(events.map(e=>e.record_date)).size!==events.length)throw new Error('jpm_ambiguous_distribution')
  return events
}
