import { verifyGithubCollectorToken } from '../sync-international-announcements/githubOidc.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
import { validateStatementSnapshot } from '../../../src/shared/indicators/statementCatalog.ts'
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
Deno.serve(async req=>{
 if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405})
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')??'')?.[1]
 if(!token||!url||!key)return Response.json({error:'unauthorized'},{status:401})
 try{await verifyGithubCollectorToken(token,`${url}/functions/v1/sync-sec-statements`,undefined,'sec-statement-research.yml')}
 catch{return Response.json({error:'unauthorized'},{status:401})}
 async function rpc(name:string,body:unknown){const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('statement_storage_unavailable');return r.json()}
 try{
  const bytes=await boundedBytes(new Response(req.body),64000)
  const body=record(JSON.parse(new TextDecoder().decode(bytes)))
  if(body.mode==='claim')return Response.json({tasks:await rpc('claim_sec_statements',{})})
  if(body.mode!=='finish'||typeof body.ticker!=='string'||!/^[A-Z][A-Z0-9.-]{0,9}$/.test(body.ticker)
    ||typeof body.claim_token!=='string'||!/^[a-f0-9-]{36}$/i.test(body.claim_token))throw new Error('invalid_statement_request')
  const error=body.error
  if(error!==null&&(typeof error!=='string'||!/^sec_[a-z0-9_]{1,70}$/.test(error)))throw new Error('invalid_statement_request')
  const p=error===null?validateStatementSnapshot(body.snapshot,body.ticker,new Date().toISOString().slice(0,10)):null
  const saved=await rpc('finish_sec_statement',{p_ticker:body.ticker,p_claim_token:body.claim_token,p_snapshot:error===null?p:null,p_error:error})
  return Response.json({saved},{status:saved?200:409})
 }catch(e){const invalid=e instanceof Error&&e.message.startsWith('invalid_statement');return Response.json({error:invalid?'invalid_statement_request':'statement_storage_unavailable'},{status:invalid?400:503})}
})
