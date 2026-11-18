import {expect,it,vi} from 'vitest'
import {dispatchInternational} from '../../../supabase/functions/dispatch-international-collector/dispatch'
const id='00000000-0000-4000-8000-000000000001'
it('does not dispatch without a dedicated credential or without a reservation',async()=>{
 const rpc=vi.fn(async()=>null),request=vi.fn<typeof fetch>()
 expect(await dispatchInternational('',rpc,request)).toMatchObject({reason:'credential_missing'})
 expect(rpc).not.toHaveBeenCalled()
 expect(await dispatchInternational('private',rpc,request)).toMatchObject({reason:'slot_already_reserved'})
 expect(request).not.toHaveBeenCalled()
})
it('dispatches only main collection and audits acceptance, not completion',async()=>{
 const rpc=vi.fn(async(name:string)=>name==='reserve_international_dispatch'?id:true)
 const request=vi.fn<typeof fetch>(async()=>new Response(null,{status:204}))
 expect(await dispatchInternational('private',rpc,request)).toEqual({accepted:true,reason:'accepted',http_status:204})
 expect(request.mock.calls[0][0]).toBe('https://api.github.com/repos/Investvalora/Valora/actions/workflows/international-announcements.yml/dispatches')
 expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ref:'main',inputs:{probe_only:false}})
 expect(rpc.mock.calls[1]).toEqual(['finish_international_dispatch',{p_id:id,p_status:'accepted',p_http_status:204}])
})
it.each([401,403,429,500])('reports rejected dispatch %s without leaking response content',async status=>{
 const rpc=vi.fn(async(name:string)=>name==='reserve_international_dispatch'?id:true)
 expect(await dispatchInternational('private',rpc,async()=>new Response('SECRET',{status}))).toEqual({accepted:false,reason:'rejected',http_status:status})
})
it('audits network failures without propagating credential-bearing exceptions',async()=>{
 const rpc=vi.fn(async(name:string)=>name==='reserve_international_dispatch'?id:true)
 expect(await dispatchInternational('private',rpc,async()=>{throw Error('SECRET')})).toEqual({accepted:false,reason:'unavailable',http_status:null})
})
it('fails visibly if accepting the dispatch cannot be audited',async()=>{
 await expect(dispatchInternational('private',async name=>name==='reserve_international_dispatch'?id:false,async()=>new Response(null,{status:204}))).rejects.toThrow('dispatch_audit_unavailable')
})
