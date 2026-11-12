import { execFileSync } from 'node:child_process'
import { blackrockIndex,blackrockListingUrl,blackrockLinks,blackrockUrl,blackrockMunicipalAnnouncements } from '../supabase/functions/sync-international-announcements/blackrock.ts'
async function readPublic(url) {
  if(url!==blackrockIndex&&!/^https:\/\/www[.]blackrock[.]com\/us\/individual\/education\/closed-end-funds\/press-releases\/\d+[.]ajax[?]noWrapper=true$/.test(url))blackrockUrl(url)
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Valora public data collector',Accept:'text/html,application/pdf'}})
  if(!r.ok||!r.body)throw new Error('issuer_source_unavailable')
  const reader=r.body.getReader();let size=0;const chunks=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('issuer_source_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=Buffer.concat(chunks)
  if(!url.endsWith('.pdf'))return bytes.toString('utf8')
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('issuer_document_changed')
  try{return execFileSync(process.env.PDF_PYTHON??'python3',['-c','import sys,io;from pypdf import PdfReader;r=PdfReader(io.BytesIO(sys.stdin.buffer.read()));assert len(r.pages)<=12;print("\\n".join(p.extract_text() for p in r.pages))'],{input:bytes,encoding:'utf8',timeout:15000,maxBuffer:256*1024})}
  catch{throw new Error('issuer_document_unreadable')}
}
export async function blackrockAnnouncements(asOf,ticker='BMN',read=readPublic) {
 const listing=blackrockListingUrl(await read(blackrockIndex));const links=blackrockLinks(await read(listing),asOf);const events=new Map()
 for(const link of links)for(const event of blackrockMunicipalAnnouncements(await read(link.url),link,ticker,asOf)) {
  if(event.ex_date<new Date(Date.parse(asOf)-366*86400000).toISOString().slice(0,10))continue
  const previous=events.get(event.ex_date)
  if(previous&&(previous.value_per_share!==event.value_per_share||previous.payment_date!==event.payment_date))throw new Error('issuer_event_conflict')
  if(!previous||event.declaration_date>previous.declaration_date)events.set(event.ex_date,event)
 }
 if(!events.size||events.size>20)throw new Error('issuer_calendar_conflict')
 return [...events.values()]
}
