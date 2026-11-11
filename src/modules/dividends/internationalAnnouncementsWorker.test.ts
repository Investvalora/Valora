import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../../../supabase/functions/sync-international-announcements/githubOidc.ts',()=>({authorizeInternationalCollector:async(r:Request)=>r.headers.get('authorization')==='Bearer internal-test-key'}))
let handler:(r:Request)=>Promise<Response>
let fetchMock:ReturnType<typeof vi.fn>
beforeEach(async()=>{
 vi.resetModules();vi.stubGlobal('Deno',{env:{get:(n:string)=>n==='SUPABASE_URL'?'https://internal.invalid':'internal-test-key'},serve:(h:typeof handler)=>{handler=h}})
 fetchMock=vi.fn(async(url:string)=>url.includes('claim_international')?Response.json([{ticker:'AAPL',claim_token:'11111111-1111-4111-8111-111111111111',internal_field:'not-returned'}]):Response.json({saved:1,conflicts:0,error:null}))
 vi.stubGlobal('fetch',fetchMock);const path='../../../supabase/functions/sync-international-announcements/index.ts';await import(path)
})
afterEach(()=>vi.unstubAllGlobals())
const invoke=(body:unknown)=>handler(new Request('https://internal.invalid',{method:'POST',headers:{Authorization:'Bearer internal-test-key'},body:JSON.stringify(body)}))
it('rejects unauthenticated collection before accessing queue',async()=>{expect((await handler(new Request('https://internal.invalid',{method:'POST'}))).status).toBe(401);expect(fetchMock).not.toHaveBeenCalled()})
it('returns only leased tickers and claim tokens',async()=>{expect(await(await invoke({mode:'claim'})).json()).toEqual({tasks:[{ticker:'AAPL',claim_token:'11111111-1111-4111-8111-111111111111'}]});expect(fetchMock).toHaveBeenCalledTimes(1)})
it('sends completion through the atomic lease RPC without personal receipts',async()=>{
 const r=await invoke({mode:'finish',ticker:'AAPL',claim_token:'11111111-1111-4111-8111-111111111111',events:[],error:null});expect(await r.json()).toMatchObject({saved:1,received_income_created:0});expect(fetchMock.mock.calls[0][0]).toContain('/finish_international_announcements')
})
it('accepts bounded issuer diagnostics through the same authenticated lease path',async()=>{
 const r=await invoke({mode:'finish',ticker:'JPM',claim_token:'11111111-1111-4111-8111-111111111111',events:[],error:'jpm_identity_changed'})
 expect(r.status).toBe(200);expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({p_ticker:'JPM',p_error:'jpm_identity_changed'})
})
it.each([{mode:'unknown'},{mode:'finish',ticker:'AAPL',claim_token:'------------------------------------',events:[],error:null},{mode:'finish',ticker:'AAPL',claim_token:'11111111-1111-4111-8111-111111111111',events:[],error:'remote body with secret'}])('rejects invalid mode, lease or unsafe error %j',async body=>{expect((await invoke(body)).status).toBe(400);expect(fetchMock).not.toHaveBeenCalled()})
