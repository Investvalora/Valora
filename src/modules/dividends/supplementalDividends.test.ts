import { expect, it, vi } from 'vitest'
import { supplementalEvents, fetchSupplemental, collectSupplemental } from '../../../supabase/functions/sync-international-announcements/supplemental'
const today='2026-11-13'
const row={id:'evt_1',ticker:'JNJ',ex_dividend_date:'2026-11-24',record_date:'2026-11-24',pay_date:'2026-12-08',declaration_date:'2026-10-13',cash_amount:1.34,currency:'USD',distribution_type:'recurring'}
const massive=(rows:unknown[])=>({status:'OK',results:rows})
const alpacaRow={id:'evt_2',symbol:'JNJ',rate:1.34,ex_date:'2026-11-24',record_date:'2026-11-24',payable_date:'2026-12-08',process_date:'2026-11-24',special:false,foreign:false}
it('keeps vendor event ID and the unadjusted amount',()=>{
 expect(supplementalEvents('massive','JNJ',massive([{...row,split_adjusted_cash_amount:0.67}]),today)).toMatchObject({events:[{event_id:'evt_1',value_per_share:'1.34',payment_date:'2026-12-08',currency:'USD'}],truncated:false})
})
it('does not fabricate Alpaca declaration or currency from process date and foreign flag',()=>{
 expect(supplementalEvents('alpaca','JNJ',{corporate_actions:{cash_dividends:[alpacaRow]}},today).events[0]).toMatchObject({declaration_date:null,currency:null,distribution:'recurring'})
})
it('preserves special events and separate IDs even on the same dates',()=>{
 const events=supplementalEvents('massive','JNJ',massive([row,{...row,id:'evt_3',distribution_type:'special'}]),today).events
 expect(events).toHaveLength(2);expect(events[1].distribution).toBe('special')
})
it('keeps special due-bill dates as evidence without forcing ex to equal record',()=>{
 expect(supplementalEvents('massive','JNJ',massive([{...row,distribution_type:'special',record_date:'2026-11-20',pay_date:'2026-11-21'}]),today).events[0]).toMatchObject({ex_date:'2026-11-24',record_date:'2026-11-20',payment_date:'2026-11-21',distribution:'special'})
})
it.each([{ticker:'KO'},{id:'../../key'},{cash_amount:0},{cash_amount:'0.123456789'},{ex_dividend_date:'2026-02-30'},{declaration_date:'2026-12-01'},{pay_date:'2026-10-01'},{currency:'usd'},{distribution_type:'unknown_new_type'}])('rejects invalid identities and financial fields %j',change=>{
 expect(()=>supplementalEvents('massive','JNJ',massive([{...row,...change}]),today)).toThrow()
})
it('rejects duplicate IDs without merging or summing rows',()=>{
 expect(()=>supplementalEvents('massive','JNJ',massive([row,row]),today)).toThrow('invalid_id')
})
it('records incomplete calendars rather than substituting dates',()=>{
 expect(supplementalEvents('massive','JNJ',massive([{...row,pay_date:null}]),today).events[0].payment_date).toBeNull()
})
it('marks pagination incomplete without following an arbitrary next URL',async()=>{
 const request=vi.fn(async()=>Response.json({...massive([row]),next_url:'https://attacker.invalid?secret=x'}))
 expect(await fetchSupplemental('massive','JNJ',{key:'fixture'},today,request)).toMatchObject({truncated:true})
 expect(request).toHaveBeenCalledTimes(1)
 const [url,init]=request.mock.calls[0] as unknown as [URL,RequestInit]
 expect(url.origin).toBe('https://api.massive.com');expect(url.href).not.toContain('fixture');expect(init.method).toBe('GET');expect(init.redirect).toBe('error')
})
it.each([[401,'credentials_rejected'],[403,'access_denied'],[429,'rate_limited'],[503,'source_unavailable']])('returns bounded diagnostics for status %s',async(status,error)=>{
 await expect(fetchSupplemental('massive','JNJ',{key:'fixture'},today,async()=>new Response('secret',{status:Number(status)}))).rejects.toThrow(`supplemental_${error}`)
})
it('sanitizes upstream exceptions containing credentials',async()=>{
 await expect(fetchSupplemental('massive','JNJ',{key:'fixture'},today,async()=>{throw new Error('https://api?key=secret')})).rejects.toThrow('supplemental_source_unavailable')
})
it('uses only the data endpoint for Alpaca',async()=>{
 const request=vi.fn(async()=>Response.json({corporate_actions:{cash_dividends:[alpacaRow]}}))
 await fetchSupplemental('alpaca','JNJ',{key:'fixture',secret:'private'},today,request)
 const [url,init]=request.mock.calls[0] as unknown as [URL,RequestInit]
 expect(url.origin).toBe('https://data.alpaca.markets');expect(url.searchParams.get('types')).toBe('cash_dividend');expect(init.method).toBe('GET')
})
it('skips missing secrets before reserving any request',async()=>{
 const rpc=vi.fn()
 expect(await collectSupplemental(rpc,async()=>'',today)).toMatchObject({results:[{provider:'massive',skipped:'credentials_missing'},{provider:'alpaca',skipped:'credentials_missing'}]})
 expect(rpc).not.toHaveBeenCalled()
})
it('consumes one lease per provider and passes partial diagnostics to finish',async()=>{
 const rpc=vi.fn(async(name:string)=>name==='claim_supplemental_dividends'?[{ticker:'JNJ',claim_token:'lease'}]:{observations:1,error:null})
 const request=vi.fn(async(url:RequestInfo|URL)=>String(url).includes('massive')?Response.json(massive([row])):Response.json({corporate_actions:{cash_dividends:[alpacaRow]},next_page_token:'next'}))
 const result=await collectSupplemental(rpc,async()=> 'fixture',today,request)
 expect(result.received_income_created).toBe(0);expect(request).toHaveBeenCalledTimes(2)
 expect(rpc.mock.calls[3]).toMatchObject(['finish_supplemental_dividends',{p_claim_token:'lease',p_partial:true}])
})
