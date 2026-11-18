import {authorizeServiceJob} from '../_shared/serviceAuthorization.ts'
import {dispatchInternational} from './dispatch.ts'
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
async function rpc(name:string,body:Record<string,unknown>) {
 const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)})
 if(!r.ok)throw Error('dispatch_audit_unavailable')
 return r.json()
}
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405})
 if(!await authorizeServiceJob(request,url,key))return Response.json({error:'unauthorized'},{status:401})
 try{
  const result=await dispatchInternational(Deno.env.get('GITHUB_DISPATCH_TOKEN')??'',rpc)
  return Response.json(result,{status:result.reason==='credential_missing'||['unavailable','rejected'].includes(result.reason)?503:200})
 }catch{return Response.json({error:'dispatch_audit_unavailable'},{status:503})}
})
