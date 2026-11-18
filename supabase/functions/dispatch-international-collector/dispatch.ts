type Rpc = (name: string, body: Record<string,unknown>) => Promise<unknown>
/** Fixed target, one reservation per DB time slot, no raw provider errors/tokens. */
export async function dispatchInternational(token: string, rpc: Rpc, request = fetch) {
 if (!token) return {accepted:false,reason:'credential_missing'}
 const id=await rpc('reserve_international_dispatch',{})
 if(id===null)return {accepted:false,reason:'slot_already_reserved'}
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('dispatch_audit_unavailable')
 let status:'accepted'|'rejected'|'unavailable'='unavailable',httpStatus:number|null=null
 try {
  const response=await request('https://api.github.com/repos/Investvalora/Valora/actions/workflows/international-announcements.yml/dispatches',{
   method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
   body:JSON.stringify({ref:'main',inputs:{probe_only:false}}),redirect:'error',signal:AbortSignal.timeout(10000),
  })
  httpStatus=response.status;status=response.status===204?'accepted':'rejected'
 }catch{ /* Never propagate URLs, headers or arbitrary exception text. */ }
 const saved=await rpc('finish_international_dispatch',{p_id:id,p_status:status,p_http_status:httpStatus})
 if(saved!==true)throw Error('dispatch_audit_unavailable')
 return {accepted:status==='accepted',reason:status,http_status:httpStatus}
}
