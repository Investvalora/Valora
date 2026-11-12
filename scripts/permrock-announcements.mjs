import { execFileSync } from 'node:child_process'
import { permrockOrigin, permrockLinks, permrockCalendar, permrockAnnouncement, permrockUrl } from '../supabase/functions/sync-international-announcements/permrock.ts'
async function readPublic(url) {
  if(![`${permrockOrigin}/news-releases/`,`${permrockOrigin}/cash-distributions/`].includes(url))permrockUrl(url)
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Valora public data collector',Accept:'text/html,application/pdf'}})
  if(!r.ok||!r.body)throw new Error('issuer_source_unavailable')
  const reader=r.body.getReader();let size=0;const chunks=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error('issuer_source_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=Buffer.concat(chunks)
  if(!url.endsWith('.pdf'))return bytes.toString('utf8')
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('issuer_document_changed')
  try{return execFileSync(process.env.PDF_PYTHON??'python3',['-c','import sys,io;from pypdf import PdfReader;r=PdfReader(io.BytesIO(sys.stdin.buffer.read()));assert len(r.pages)<=8;print("\\n".join(p.extract_text() for p in r.pages))'],{input:bytes,encoding:'utf8',timeout:15000,maxBuffer:256*1024})}
  catch{throw new Error('issuer_document_unreadable')}
}
/** Complete issuer releases; no secondary API quota and no guessed filenames. */
export async function permrockAnnouncements(asOf,read=readPublic) {
  const links=permrockLinks(await read(`${permrockOrigin}/news-releases/`),asOf)
  const calendar=permrockCalendar(await read(`${permrockOrigin}/cash-distributions/`),asOf)
  const events=[]
  for(const link of links) {
    try{events.push(permrockAnnouncement(await read(link.url),link,calendar,asOf))}
    catch(error){throw new Error(error instanceof Error?error.message:'issuer_source_unavailable',{cause:link.url})}
  }
  if(new Set(events.map(e=>e.ex_date)).size!==events.length)throw new Error('issuer_ambiguous_distribution')
  return events
}
