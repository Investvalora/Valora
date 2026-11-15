import {expect,it} from 'vitest'
import {supplementalEvents} from '../../../supabase/functions/sync-international-announcements/supplemental'
import {nasdaqAnnouncementBatch,nasdaqAnnouncements} from '../../../supabase/functions/sync-international-announcements/nasdaq'
import {secFilings} from '../../../supabase/functions/sync-international-announcements/sec'
// @ts-expect-error Standalone runner.
import {publicText} from '../../../scripts/sec-dividend-announcements.mjs'
it('accepts the explicit empty Alpaca group without inventing events',()=>{
 expect(supplementalEvents('alpaca','AMZN',{corporate_actions:{},next_page_token:null},'2026-11-13')).toEqual({events:[],truncated:false})
})
it.each([{}, {corporate_actions:null}, {corporate_actions:[]}, {corporate_actions:{cash_dividends:null}}])('rejects malformed Alpaca payloads %j',payload=>{
 expect(()=>supplementalEvents('alpaca','NU',payload,'2026-11-13')).toThrow('invalid_response')
})
const row={exOrEffDate:'12/11/2026',type:'Cash',amount:'$0.2475',declarationDate:'02/19/2026',recordDate:'12/11/2026',paymentDate:'01/04/2027',currency:'USD'}
const payload=(rows:unknown[])=>({status:{rCode:200},data:{dividends:{rows}}})
it('keeps complete Nasdaq events and reports missing declarations',()=>{
 const data=payload([row,{...row,exOrEffDate:'12/12/2025',declarationDate:'N/A'}])
 expect(nasdaqAnnouncementBatch(data,'2026-11-13')).toMatchObject({events:[{value_per_share:0.2475}],missing:1})
 expect(()=>nasdaqAnnouncements(data,'2026-11-13')).toThrow('partial_coverage')
 expect(()=>nasdaqAnnouncementBatch(payload([{...row,recordDate:'02/30/2026'}]),'2026-11-13')).toThrow('invalid_date')
})
it('allows large bounded submissions while retaining the document cap',async()=>{
 const content=' '.repeat(5*1024*1024)
 expect((await publicText('https://data.sec.gov/submissions/CIK0000019617.json',async()=>new Response(content))).length).toBe(content.length)
 await expect(publicText('https://www.sec.gov/Archives/edgar/data/123/000000012326000001/example.htm',async()=>new Response(content))).rejects.toThrow('too_large')
 await expect(publicText('https://data.sec.gov/submissions/CIK0000019617.json',async()=>new Response(' '.repeat(8*1024*1024+1)))).rejects.toThrow('too_large')
})
it('accepts a large issuer index without increasing the four-filing discovery bound',()=>{
 const n=26513
 const data={cik:'0000019617',tickers:['JPM'],filings:{recent:{form:Array(n).fill('4'),accessionNumber:Array(n).fill(''),filingDate:Array(n).fill('2026-11-10'),primaryDocument:Array(n).fill(''),items:Array(n).fill('')}}}
 expect(secFilings(data,{ticker:'JPM',cik:'0000019617'},'2026-11-13')).toEqual({filings:[],truncated:false})
 data.filings.recent.form=Array(40001).fill('4')
 expect(()=>secFilings(data,{ticker:'JPM',cik:'0000019617'},'2026-11-13')).toThrow('identity_changed')
})
