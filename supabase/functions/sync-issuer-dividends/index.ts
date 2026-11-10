import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
import { isharesDirectory, isharesDistributions } from './ishares.ts'
const url=Deno.env.get('SUPABASE_URL') ?? '', key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}
async function rest(path:string, init:RequestInit={}) {
  const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(15000)})
  if(!r.ok) throw new Error('issuer_storage_failed')
  return r
}
Deno.serve(async request=>{
 if(request.method!=='POST') return Response.json({error:'method_not_allowed'},{status:405})
 if(!await authorizeServiceJob(request,url,key)) return Response.json({error:'unauthorized'},{status:401})
 const errors:string[]=[];let processed=0,saved=0
 try {
  const body=await request.json().catch(()=>({}))
  if(body.discover===true) {
   const response=await fetch('https://www.ishares.com/us/products/etf-investments',{redirect:'error',signal:AbortSignal.timeout(12000)})
   const directory=isharesDirectory(new TextDecoder().decode(await boundedBytes(response,4*1024*1024)))
   let discovered=0
   for(let offset=0;;offset+=500) {
    const assets=await (await rest(`assets?select=ticker&active=eq.true&type=eq.etf_us&currency=eq.USD&order=ticker&limit=500&offset=${offset}`)).json() as {ticker:string}[]
    const sources=assets.filter(a=>directory.has(a.ticker)).map(a=>({ticker:a.ticker,source_url:directory.get(a.ticker)}))
    if(sources.length) await rest('issuer_dividend_sources?on_conflict=ticker',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(sources)})
    discovered+=sources.length
    if(assets.length<500) break
   }
   return Response.json({discovered,directory_size:directory.size})
  }
  // Leased jobs resume independently of the user's browser and of portfolio size.
  const tasks=await (await rest('rpc/claim_issuer_sources',{method:'POST',body:'{}'})).json() as {ticker:string;source_url:string}[]
  for(const task of tasks) {
   let ok=false
   try {
    if(!/^https:\/\/www\.ishares\.com\/us\/products\/\d+\/[a-z0-9-]+$/.test(task.source_url)) throw new Error('invalid_source')
    const response=await fetch(task.source_url,{redirect:'error',signal:AbortSignal.timeout(12000)})
    const html=new TextDecoder().decode(await boundedBytes(response,4*1024*1024))
    const events=isharesDistributions(html,task.ticker)
    const result=await (await rest('rpc/store_issuer_distributions',{method:'POST',body:JSON.stringify({p_ticker:task.ticker,p_events:events})})).json()
    saved+=result.saved
    if(result.conflicts) throw new Error('issuer_event_conflict')
    processed++;ok=true
   } catch {errors.push(task.ticker)}
   await rest(`issuer_dividend_sources?ticker=eq.${encodeURIComponent(task.ticker)}`,{method:'PATCH',body:JSON.stringify({next_sync_at:new Date(Date.now()+(ok?86400000:3600000)).toISOString(),last_attempt_at:new Date().toISOString(),last_error:ok?null:'source_or_event_conflict',...(ok?{last_success_at:new Date().toISOString()}: {})})})
  }
  return Response.json({processed,saved,failed:errors.length,errors,received_income_created:0},{status:errors.length?503:200})
 } catch {return Response.json({processed,saved,error:'issuer_sync_incomplete'},{status:503})}
})
