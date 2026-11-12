import {expect,it,vi} from 'vitest'
import {secIdentity,secFilings,secFilingUrl,secAnnouncements} from '../../../supabase/functions/sync-international-announcements/sec.ts'
// @ts-expect-error Standalone runner.
import {discoverSecDividends,collectSecDividends} from '../../../scripts/sec-dividend-announcements.mjs'
const registry={fields:['cik','name','ticker','exchange'],data:[[123,'Example','EXM','NYSE']]}
const identity={ticker:'EXM',cik:'0000000123'}
const accession='0000000123-26-000001',document='example-20261110.htm'
const filing={accession,document,filing_date:'2026-11-10',source_url:secFilingUrl(identity.cik,accession,document)}
const asOf='2026-11-11'
const header='<ix:nonNumeric name="dei:EntityCentralIndexKey">0000000123</ix:nonNumeric><ix:nonNumeric name="dei:TradingSymbol">EXM</ix:nonNumeric>'
const statement="On November 10, 2026, the Board of Directors declared a special cash dividend on the Company's common stock of $30 per share, payable December 4, 2026, to shareholders of record at the close of business on November 24, 2026."
const html=header+'<p>'+statement+'</p>'
const recent={form:['8-K'],items:['8.01,9.01'],accessionNumber:[accession],filingDate:['2026-11-10'],primaryDocument:[document]}
const submissions={cik:'123',tickers:['EXM'],filings:{recent}}
it('maps identity by the whole SEC catalog, including class punctuation, not portfolio tickers',()=>{
 expect(secIdentity(registry,'EXM')).toEqual(identity)
 expect(secIdentity({...registry,data:[[123,'Example','EXM-B','NYSE']]},'EXM.B').cik).toBe(identity.cik)
 expect(()=>secIdentity({...registry,data:[...registry.data,...registry.data]},'EXM')).toThrow('identity')
 expect(()=>secIdentity(registry,'MISSING')).toThrow('identity')
})
it('checks submissions identity and bounds recent eligible filings',()=>{
 expect(secFilings(submissions,identity,asOf)).toEqual({filings:[filing],truncated:false})
 expect(()=>secFilings({...submissions,tickers:['OTHER']},identity,asOf)).toThrow('identity')
 expect(()=>secFilings({...submissions,cik:'999'},identity,asOf)).toThrow('identity')
 expect(secFilings({...submissions,filings:{recent:{...recent,form:['10-Q']}}},identity,asOf).filings).toHaveLength(0)
})
it.each(['../secret.htm','https://attacker.invalid/x.htm','evil.htm?redirect=x','file%2f.htm'])('refuses archive path injection %s',doc=>{expect(()=>secFilingUrl(identity.cik,accession,doc)).toThrow()})
it('extracts special as a pending gross announcement without eligibility or personal receipt',()=>{
 const e=secAnnouncements(html,identity,filing,asOf)[0]
 expect(e).toMatchObject({value_per_share:30,record_date:'2026-11-24',payment_date:'2026-12-04',distribution:'special'})
 expect(e).not.toHaveProperty('ex_date');expect(e).not.toHaveProperty('quantity');expect(e).not.toHaveProperty('net_amount')
})
it('supports ordinary declarations separately from special distributions',()=>{
 const text="The Board of Directors declared a quarterly cash dividend on the Company's common stock of $1.47 per share. The dividend was declared on November 10, 2026, and is payable December 4, 2026, to shareholders of record at the close of business on November 24, 2026."
 expect(secAnnouncements(header+text,identity,filing,asOf)[0]).toMatchObject({distribution:'regular',value_per_share:1.47})
})
it.each([html.replace('0000000123','0000000999'),html.replace('>EXM<','>OTHER<'),html.replace('$30','$0'),html.replace('November 24','November 31'),html.replace('November 10, 2026','November 12, 2026'),html+statement])('refuses wrong identity, invalid dates/amounts or multiple distributions',body=>{expect(()=>secAnnouncements(body,identity,filing,asOf)).toThrow()})
it('distinguishes no declaration from an unsupported dividend template',()=>{
 expect(secAnnouncements(header+'No common-stock dividend declared.',identity,filing,asOf)).toEqual([])
 expect(()=>secAnnouncements(header+statement.replace('common stock','preferred stock'),identity,filing,asOf)).toThrow('unsupported')
})
it('discovers links only from authenticated issuer metadata and reports unsupported coverage',async()=>{
 const read=vi.fn(async(url:string)=>url.includes('company_tickers')?JSON.stringify(registry):url.includes('submissions')?JSON.stringify(submissions):html)
 expect(await discoverSecDividends('EXM',asOf,read)).toMatchObject({cik:identity.cik,inspected:1,unsupported:0,events:[{distribution:'special'}]})
 expect(read.mock.calls[2][0]).toBe(filing.source_url)
})
const endpoint='https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements'
it('submits only leased tasks to the separate discovery ledger',async()=>{
 const request=vi.fn(async(_u:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim_sec'?Response.json({tasks:[{ticker:'EXM',claim_token:'lease'}]}):Response.json({saved:1,conflicts:0,error:null,eligible_dividends_created:0,received_income_created:0}))
 const discover=vi.fn(async()=>({cik:identity.cik,events:secAnnouncements(html,identity,filing,asOf),inspected:1,truncated:false,unsupported:0}))
 expect(await collectSecDividends({endpoint,token:'fixture',request,discover})).toMatchObject({failed:0,results:[{saved:1,eligible_dividends_created:0}]})
 expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({mode:'finish_sec',ticker:'EXM',claim_token:'lease',partial:false})
})
it('never sends identity to a foreign endpoint',async()=>{const request=vi.fn();await expect(collectSecDividends({endpoint:'https://other.invalid',token:'fixture',request})).rejects.toThrow('configuration');expect(request).not.toHaveBeenCalled()})
