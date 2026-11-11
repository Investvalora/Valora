import { expect, it, vi } from 'vitest'
// @ts-expect-error Standalone Node runner has no application-facing declarations.
import { collectAnnouncements } from '../../../scripts/collect-international-announcements.mjs'
const endpoint='https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements'
const identity={status:{rCode:200},data:{symbol:'AAPL',stockType:'Common Stock',isNasdaqListed:true,assetClass:'STOCKS'}}
function sourceFixture() {
 const us=(offset:number)=>{const [y,m,d]=new Date(Date.now()+offset*86400000).toISOString().slice(0,10).split('-');return `${m}/${d}/${y}`}
 return vi.fn(async(_ticker:string,resource:string)=>resource==='info'?identity:{status:{rCode:200},data:{dividends:{rows:[{exOrEffDate:us(1),recordDate:us(1),paymentDate:us(4),declarationDate:us(0),amount:'$0.27',currency:'USD',type:'Cash'}]}}})
}
it('collects only leased assets and submits the same one-time claim token',async()=>{
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'AAPL',claim_token:'lease-token'}]}):Response.json({saved:1,conflicts:0,error:null}))
 const result=await collectAnnouncements({endpoint,token:'fixture-token',source:sourceFixture(),request})
 expect(result).toMatchObject({failed:0,results:[{ticker:'AAPL',events:1,saved:1}]})
 const finish=JSON.parse(String(request.mock.calls[1][1].body));expect(finish).toMatchObject({mode:'finish',ticker:'AAPL',claim_token:'lease-token',error:null})
 expect(request.mock.calls.every(([url])=>url===endpoint)).toBe(true)
})
it('does not give a foreign endpoint the collector identity',async()=>{
 const request=vi.fn();await expect(collectAnnouncements({endpoint:'https://attacker.invalid',token:'fixture-token',request})).rejects.toThrow('configuration')
 expect(request).not.toHaveBeenCalled()
})
it('runs the public probe without queue calls or credentials',async()=>{
 const request=vi.fn();const source=sourceFixture()
 const result=await collectAnnouncements({probeOnly:true,source:async(t:string,r:string)=>r==='info'?{...identity,data:{...identity.data,symbol:t}}:source(t,r),request})
 expect(result.failed).toBe(0);expect(request).not.toHaveBeenCalled()
})
it('reports unsupported assets without marking them successful or retrying the source',async()=>{
 const source=vi.fn(async()=>({...identity,data:{...identity.data,isNasdaqListed:false}}))
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'AAPL',claim_token:'lease-token'}]}):Response.json({saved:0,conflicts:0,error:'nasdaq_identity_unsupported'}))
 const result=await collectAnnouncements({endpoint,token:'fixture-token',source,request})
 expect(result).toMatchObject({failed:0,unsupported:1});expect(source).toHaveBeenCalledTimes(1)
 expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({events:[],error:'nasdaq_identity_unsupported'})
})

it('routes JPM to the primary issuer without calling the Nasdaq adapter',async()=>{
 const source=vi.fn();const issuerSource=vi.fn(async()=>[{record_date:'2026-10-06',payment_date:'2026-10-31',value_per_share:1.65}])
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'JPM',claim_token:'lease-token'}]}):Response.json({saved:1,conflicts:0,error:null}))
 const result=await collectAnnouncements({endpoint,token:'fixture-token',source,issuerSource,request})
 expect(result).toMatchObject({failed:0,results:[{ticker:'JPM',saved:1}]});expect(source).not.toHaveBeenCalled();expect(issuerSource).toHaveBeenCalledOnce()
})
it('reports issuer failures without sending partial events or remote bodies',async()=>{
 const issuerSource=vi.fn(async()=>{throw new Error('jpm_identity_changed')})
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'JPM',claim_token:'lease-token'}]}):Response.json({saved:0,conflicts:0,error:'jpm_identity_changed'}))
 expect(await collectAnnouncements({endpoint,token:'fixture-token',issuerSource,request})).toMatchObject({failed:1})
 expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({events:[],error:'jpm_identity_changed'})
})
