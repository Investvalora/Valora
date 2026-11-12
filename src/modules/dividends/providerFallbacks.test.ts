import { afterEach, expect, it, vi } from 'vitest'
import { providerEvents, fetchProviderEvents, collectProviderFallbacks, marketstackKeys, rotatingMarketstack, providerOperationalFailure } from '../../../supabase/functions/sync-international-announcements/providers'
const event = { ex_dividend_date:'2026-11-24',declaration_date:'2026-11-10',record_date:'2026-11-24',payment_date:'2026-12-04',amount:'30.0' }
const alpha = { symbol:'COST',data:[event] }
afterEach(()=>vi.unstubAllGlobals())
it('preserves seven and eight decimal vendor observations without rejecting valid neighboring events',()=>{
 const data=[{...event,amount:'0.0196242'},{...event,ex_dividend_date:'2026-11-25',record_date:'2026-11-25',amount:'0.00000001'}]
 expect(providerEvents('alpha_vantage','COST',{symbol:'COST',data},'2026-11-12').map(e=>e.value_per_share)).toEqual([0.0196242,0.00000001])
 expect(()=>providerEvents('alpha_vantage','COST',{symbol:'COST',data:[{...event,amount:'0.019624201'}]},'2026-11-12')).toThrow('provider_invalid_amount')
 expect(()=>providerEvents('alpha_vantage','COST',{symbol:'COST',data:[{...event,amount:'999999999999.12345678'}]},'2026-11-12')).toThrow('provider_invalid_amount')
})
it('does not import vendor-rounded zero and explicitly reports insufficient precision',()=>{
 const p={pagination:{total:1,count:1},data:[{symbol:'PRT',date:'2026-10-30',declaration_date:'2026-10-20',record_date:'2026-10-30',payment_date:'2026-11-16',dividend:0}]}
 expect(()=>providerEvents('marketstack','PRT',p,'2026-11-12')).toThrow('provider_precision_unavailable')
})
it('distinguishes missing coverage from invalid observations and technical failures',()=>{
 expect(providerOperationalFailure('provider_calendar_unavailable')).toBe(false)
 expect(providerOperationalFailure('provider_precision_unavailable')).toBe(false)
 expect(providerOperationalFailure('provider_precision_limited')).toBe(false)
 expect(providerOperationalFailure(null)).toBe(false)
 for(const error of ['provider_invalid_amount','provider_event_conflict','provider_rejected','provider_request_failed','provider_identity_changed']) expect(providerOperationalFailure(error)).toBe(true)
})
it('deduplicates list, primary and numbered keys and caps configuration at eight accounts',()=>{
 expect(marketstackKeys('a; b, c\nd','a',[' b ','e'])).toEqual(['a','b','c','d','e'])
 expect(marketstackKeys('a,b,c,d,e,f,g,h,i','',[])).toHaveLength(8)
})
it('switches accounts after explicit quota exhaustion without returning credentials',async()=>{
 let blocked=false
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async(name,body)=>{
  if(name==='block_marketstack_key'){blocked=true;return null}
  return (body as {p_key_ids:string[]}).p_key_ids[blocked?1:0]
 })
 const request=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({error:{code:'usage_limit_reached'}},{status:429}))
  .mockResolvedValueOnce(Response.json({pagination:{total:1,count:1},data:[{symbol:'MA',date:'2026-10-09',declaration_date:'2026-09-29',record_date:'2026-10-09',payment_date:'2026-11-09',dividend:0.87}]}))
 expect(await rotatingMarketstack(rpc,['first-private','second-private'],'MA','2026-11-12',request)).toHaveLength(1)
 expect(request).toHaveBeenCalledTimes(2)
 expect(rpc.mock.calls[1][1]).toMatchObject({p_reason:'provider_quota_exhausted'})
 expect(JSON.stringify(rpc.mock.calls)).not.toContain('private')
})
it('does not spend another account quota on transport failures or incompatible event data',async()=>{
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async(_name,body)=>(body as {p_key_ids:string[]}).p_key_ids[0])
 const request=vi.fn<typeof fetch>(async()=>{throw new Error('network private')})
 await expect(rotatingMarketstack(rpc,['first','second'],'MA','2026-11-12',request)).rejects.toThrow('provider_request_failed')
 expect(request).toHaveBeenCalledTimes(1);expect(rpc).toHaveBeenCalledTimes(1)
})
it('does not send HTTP requests when all account budgets are unavailable',async()=>{
 const rpc=vi.fn(async()=>null),request=vi.fn<typeof fetch>()
 await expect(rotatingMarketstack(rpc,['first'],'MA','2026-11-12',request)).rejects.toThrow('provider_keys_unavailable')
 expect(request).not.toHaveBeenCalled()
})
it('normalizes the observed Alpha Vantage special without inventing classification or currency',()=>{
 expect(providerEvents('alpha_vantage','COST',alpha,'2026-11-12')).toEqual([{ex_date:'2026-11-24',declaration_date:'2026-11-10',record_date:'2026-11-24',payment_date:'2026-12-04',value_per_share:30}])
})
it('normalizes Marketstack SQL timestamps as calendar dates without shifting timezone',()=>{
 const p={pagination:{total:1,count:1},data:[{symbol:'MA',date:'2026-10-09',declaration_date:'2026-09-29 00:00:00',record_date:'2026-10-09 04:00:00',payment_date:'2026-11-09 05:00:00',dividend:0.87}]}
 expect(providerEvents('marketstack','MA',p,'2026-11-12')[0]).toMatchObject({ex_date:'2026-10-09',payment_date:'2026-11-09',value_per_share:0.87})
 expect(()=>providerEvents('marketstack','COST',p,'2026-11-12')).toThrow('identity')
 expect(()=>providerEvents('marketstack','MA',{...p,pagination:{total:2,count:1}},'2026-11-12')).toThrow('truncated')
})
it.each([{Information:'premium'}, {symbol:'OTHER',data:[event]}, {symbol:'COST',data:[{...event,ex_dividend_date:'2026-11-31'}]}, {symbol:'COST',data:[event,event]}, {symbol:'COST',data:[{...event,amount:'NaN'}]}])('rejects quota, wrong identity, invalid dates, duplicate distributions and amounts', p=>{
 expect(()=>providerEvents('alpha_vantage','COST',p,'2026-11-12')).toThrow()
})
it('missing ex-date is never replaced with record date',()=>{
 expect(()=>providerEvents('alpha_vantage','COST',{symbol:'COST',data:[{...event,ex_dividend_date:null}]},'2026-11-12')).toThrow('calendar_unavailable')
})
it('does not expose secrets in network exceptions and refuses redirects',async()=>{
 const request=vi.fn<typeof fetch>(async()=>{throw new Error('https://vendor.invalid?apikey=private')})
 await expect(fetchProviderEvents('alpha_vantage','COST','private','2026-11-12',request)).rejects.toThrow(/^provider_request_failed$/)
 expect(request.mock.calls[0][1]).toMatchObject({redirect:'error'})
})
it('does not call vendors without backend secrets or when quota reservation returns no tasks',async()=>{
 const rpc=vi.fn(async()=>[]);vi.stubGlobal('fetch',vi.fn())
 expect(await collectProviderFallbacks(rpc,()=>'', '2026-11-12')).toEqual({results:[],skipped:[{provider:'alpha_vantage',reason:'provider_key_missing'},{provider:'marketstack',reason:'provider_key_missing'}],received_income_created:0})
 expect(rpc).not.toHaveBeenCalled()
 await collectProviderFallbacks(rpc,()=> 'private','2026-11-12')
 expect(rpc).toHaveBeenCalledTimes(2);expect(fetch).not.toHaveBeenCalled()
})
it('reserves before fetching and completes vendor failures without leaking response bodies',async()=>{
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async name=>name==='claim_dividend_provider'?[{ticker:'COST',claim_token:'lease'}]:{})
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({Information:'private vendor error'})))
 const result=await collectProviderFallbacks(rpc,n=>n==='ALPHA_VANTAGE_API_KEY'?'private':'','2026-11-12')
 expect(rpc.mock.calls[0][0]).toBe('claim_dividend_provider')
 expect(result.results[0].error).toBe('provider_rejected')
 expect(rpc.mock.calls[1][1]).toMatchObject({p_events:[],p_error:'provider_rejected'})
})
it('propagates database conflicts so the workflow and durable audit cannot report success',async()=>{
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async name=>name==='claim_dividend_provider'?[{ticker:'COST',claim_token:'lease'}]:{error:'provider_event_conflict'})
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(alpha)))
 const result=await collectProviderFallbacks(rpc,n=>n==='ALPHA_VANTAGE_API_KEY'?'private':'','2026-11-12')
 expect(result.results[0]).toMatchObject({events:1,error:'provider_event_conflict'})
 expect(providerOperationalFailure(result.results[0].error)).toBe(true)
})
it('records a missing calendar on the task rather than inventing events or marking coverage complete',async()=>{
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async name=>name==='claim_dividend_provider'?[{ticker:'AMZN',claim_token:'lease'}]:{error:'provider_calendar_unavailable'})
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({symbol:'AMZN',data:[]})))
 const result=await collectProviderFallbacks(rpc,n=>n==='ALPHA_VANTAGE_API_KEY'?'private':'','2026-11-12')
 expect(result.results[0]).toMatchObject({events:0,error:'provider_calendar_unavailable'})
 expect(rpc.mock.calls[1][1]).toMatchObject({p_events:[],p_error:'provider_calendar_unavailable'})
 expect(providerOperationalFailure(result.results[0].error)).toBe(false)
})

it('reports per-key budget deferral without leasing or requesting vendors',async()=>{
 const rpc=vi.fn<(name:string,body:unknown)=>Promise<unknown>>(async()=>false);vi.stubGlobal('fetch',vi.fn())
 const result=await collectProviderFallbacks(rpc,n=>n==='MARKETSTACK_API_KEY'?'private':'','2026-11-12')
 expect(result.skipped).toContainEqual({provider:'marketstack',reason:'provider_key_budget_exhausted'})
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['marketstack_budget_available'])
 expect(fetch).not.toHaveBeenCalled()
})
