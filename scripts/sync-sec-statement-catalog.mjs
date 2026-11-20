import { collectSecStatementResearch } from './collect-sec-statement-research.mjs'
const endpoint='https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-sec-statements'
export async function syncSecStatementCatalog(token,request=fetch,collect=collectSecStatementResearch){
 if(!token)throw new Error('statement_identity_missing')
 async function call(body){const r=await request(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`statement_storage_http_${r.status}`);return r.json()}
 const {tasks}=await call({mode:'claim'})
 if(!Array.isArray(tasks)||tasks.length>2||tasks.some(t=>typeof t.ticker!=='string'||!/^[A-Z][A-Z0-9.-]{0,9}$/.test(t.ticker)||typeof t.claim_token!=='string'))throw new Error('statement_invalid_tasks')
 if(!tasks.length)return {processed:0,failed:0,results:[]}
 const {results}=await collect(tasks.map(t=>t.ticker),request)
 const output=[]
 for(const task of tasks){
  const snapshot=results.find(r=>r.ticker===task.ticker)
  const error=!snapshot?'sec_statement_source_unavailable':snapshot.status==='unavailable'?snapshot.error:null
  const saved=await call({mode:'finish',ticker:task.ticker,claim_token:task.claim_token,snapshot:error===null?snapshot:null,error})
  if(saved.saved!==true)throw new Error('statement_not_saved')
  output.push({ticker:task.ticker,status:snapshot?.status??'unavailable',error})
 }
 return {processed:tasks.length,results:output,failed:output.filter(r=>r.error&&!['sec_identity_unavailable','sec_statement_sector_unsupported','sec_statement_annual_unavailable'].includes(r.error)).length}
}
if(process.argv[1]?.replace(/\\/g,'/').endsWith('/sync-sec-statement-catalog.mjs')){
 const target=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL??'')
 if(target.protocol!=='https:'||!target.hostname.endsWith('.actions.githubusercontent.com')||!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)throw new Error('statement_identity_missing')
 target.searchParams.set('audience',endpoint)
 const r=await fetch(target,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(10000)})
 if(!r.ok)throw new Error('statement_identity_missing')
 const {value}=await r.json()
 if(typeof value!=='string'||value.length>16000)throw new Error('statement_identity_missing')
 process.stdout.write(`::add-mask::${value}\n`)
 const result=await syncSecStatementCatalog(value)
 console.log(JSON.stringify(result));if(result.failed)process.exitCode=1
}
