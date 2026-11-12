import { secIdentity, secFilings, secAnnouncements } from '../supabase/functions/sync-international-announcements/sec.ts'
const registry='https://www.sec.gov/files/company_tickers_exchange.json'
/** SEC asks for an identified agent and <=10 requests/s. Sequential, 250ms spacing. */
async function publicText(url) {
  const u=new URL(url)
  if(u.protocol!=='https:' || u.username || u.password || u.search || u.hash || !(url===registry || /^https:\/\/data\.sec\.gov\/submissions\/CIK\d{10}\.json$/.test(url) || /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/[a-zA-Z0-9_-]+\.html?$/.test(url)))throw new Error('sec_invalid_source')
  await new Promise(resolve=>setTimeout(resolve,250))
  const r=await fetch(url,{headers:{'User-Agent':'Valora public data collector valorainvestbr@gmail.com',Accept:'application/json,text/html'},redirect:'error',signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`sec_http_${r.status}`)
  const reader=r.body?.getReader();if(!reader)throw new Error('sec_source_unavailable')
  const chunks=[];let size=0
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024)throw new Error('sec_response_too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const b=new Uint8Array(size);let offset=0;for(const part of chunks){b.set(part,offset);offset+=part.length}return new TextDecoder().decode(b)
}
export async function discoverSecDividends(ticker,asOf,read=publicText) {
  const identity=secIdentity(JSON.parse(await read(registry)),ticker)
  const discovery=secFilings(JSON.parse(await read(`https://data.sec.gov/submissions/CIK${identity.cik}.json`)),identity,asOf)
  const events=[];let unsupported=0
  for(const filing of discovery.filings) {
    try{events.push(...secAnnouncements(await read(filing.source_url),identity,filing,asOf))}
    catch(e){if(e instanceof Error && e.message==='sec_distribution_unsupported'){unsupported++;continue}throw e}
  }
  return {cik:identity.cik,events,inspected:discovery.filings.length,truncated:discovery.truncated,unsupported}
}

export async function collectSecDividends({endpoint,token,request=fetch,discover=discoverSecDividends}) {
  if(endpoint!=='https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements' || !token)throw new Error('sec_collector_configuration_missing')
  async function call(body) {
    const r=await request(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)})
    if(!r.ok)throw new Error(`sec_collector_http_${r.status}`)
    return r.json()
  }
  const {tasks}=await call({mode:'claim_sec'})
  if(!Array.isArray(tasks) || tasks.length>1)throw new Error('sec_invalid_batch')
  const results=[]
  for(const task of tasks) {
    let data={cik:null,events:[],inspected:0,truncated:false,unsupported:0},error=null
    try{data=await discover(task.ticker,new Date().toISOString().slice(0,10))}
    catch(e){error=e instanceof Error && /^sec_[a-z0-9_]{1,60}$/.test(e.message)?e.message:'sec_source_unavailable'}
    const stored=await call({mode:'finish_sec',ticker:task.ticker,claim_token:task.claim_token,cik:data.cik,events:data.events,error,inspected:data.inspected,partial:data.truncated||data.unsupported>0})
    results.push({ticker:task.ticker,events:data.events.length,inspected:data.inspected,...stored})
  }
  return {provider:'sec',results,failed:results.filter(r=>r.error && !['sec_identity_unavailable','sec_partial_coverage'].includes(r.error)).length}
}
