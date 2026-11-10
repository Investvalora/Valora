import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
import { b3Announcements } from './announcements.ts'
const url=Deno.env.get('SUPABASE_URL') ?? '',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}
async function rest(path:string,init:RequestInit={}) {
 const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers,signal:AbortSignal.timeout(15000)})
 if(!r.ok) throw new Error('b3_storage_failed');return r
}
Deno.serve(async request=>{
 if(request.method!=='POST') return Response.json({error:'method_not_allowed'},{status:405})
 if(!await authorizeServiceJob(request,url,key)) return Response.json({error:'unauthorized'},{status:401})
 let saved=0,processed=0;const errors:string[]=[]
 try {
  const tasks=await (await rest('rpc/claim_b3_dividend_assets',{method:'POST',body:'{}'})).json() as {ticker:string;isin:string;issuing_company:string}[]
  for(const task of tasks) {
   let ok=false
   try {
    const query=btoa(JSON.stringify({issuingCompany:task.issuing_company,language:'pt-br'}))
    const source=`https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/${encodeURIComponent(query)}`
    const response=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(12000)})
    const payload=JSON.parse(new TextDecoder().decode(await boundedBytes(response,4*1024*1024)))
    const events=b3Announcements(payload,task.ticker,task.isin,source)
    if(events.length) {
     const result=await (await rest('rpc/store_b3_announcements',{method:'POST',body:JSON.stringify({p_events:events})})).json()
     saved+=result.saved
    }
    processed++;ok=true
   } catch {errors.push(task.ticker)}
   await rest(`b3_dividend_tasks?ticker=eq.${encodeURIComponent(task.ticker)}`,{method:'PATCH',body:JSON.stringify({next_sync_at:new Date(Date.now()+(ok?86400000:3600000)).toISOString(),last_error:ok?null:'b3_source_or_storage_failed',...(ok?{last_success_at:new Date().toISOString()}: {})})})
  }
  return Response.json({processed,saved,failed:errors.length,errors,received_income_created:0},{status:errors.length?503:200})
 } catch {return Response.json({processed,saved,error:'b3_dividend_sync_incomplete'},{status:503})}
})
