import {expect,it,vi} from 'vitest'
import {permrockLinks,permrockCalendar,permrockAnnouncement,permrockUrl} from '../../../supabase/functions/sync-international-announcements/permrock'
import {metaLinks,metaAnnouncement,metaUrl} from '../../../supabase/functions/sync-international-announcements/meta'
// @ts-expect-error Standalone collector.
import {collectAnnouncements} from '../../../scripts/collect-international-announcements.mjs'
const asOf='2026-11-12'
const link={url:'https://permrock.com/wp-content/uploads/2026/09/Sep-26-PRRT-PR.pdf',declaration_date:'2026-09-18'}
const calendar='<h1>PermRock Royalty TRUST 2026 CALENDAR</h1> Ex-Div / Record Date <p>September 09-18-2026 ** 09-30-2026 10-15-2026 $ 0.019624</p> ex-dates the same as the record date'
const pdf='DALLAS, Texas, September 18, 2026 – PermRock Royalty Trust (NYSE:PRT) today declared a monthly cash distribution to holders as of September 30, 2026, and payable on October 15, 2026, in the amount of $238,742.30 ($0.0196242 per Trust Unit)'
it('uses full PDF precision with independent primary ex evidence, not rounded calendar value',()=>{
 const e=permrockAnnouncement(pdf,link,permrockCalendar(calendar,asOf),asOf)
 expect(e).toMatchObject({value_per_share:0.0196242,ex_date:'2026-09-30',payment_date:'2026-10-15',source_url:link.url})
 expect(e).not.toHaveProperty('quantity');expect(e).not.toHaveProperty('net_amount')
})
it.each([pdf.replace('NYSE:PRT','NYSE:PVL'),pdf.replace('0.0196242','0.0296242'),pdf.replace('October 15','October 16'),pdf+pdf])('refuses wrong trust, contradictory amount/dates or ambiguous documents',text=>{
 expect(()=>permrockAnnouncement(text,link,permrockCalendar(calendar,asOf),asOf)).toThrow()
})
it('does not silently use record as ex when the primary calendar is missing',()=>{
 expect(()=>permrockAnnouncement(pdf,link,new Map(),asOf)).toThrow('calendar_conflict')
 expect(()=>permrockCalendar(calendar.replace('Ex-Div / Record Date','Record Date'),asOf)).toThrow('evidence_missing')
})
it('recognizes observed PDF word splits without changing the financial value',()=>{
 expect(permrockAnnouncement(pdf.replace('payable on','payable o n').replace('amount','am ount'),link,permrockCalendar(calendar,asOf),asOf).value_per_share).toBe(0.0196242)
})
it('discovers bounded issuer links and rejects foreign URLs',()=>{
 const html=`PermRock Royalty Trust <a href="${link.url}">September 18, 2026 PermRock Royalty Trust Declares Monthly Cash Distribution</a>`
 expect(permrockLinks(html,asOf)).toEqual([link])
 expect(()=>permrockLinks(html.replace('https://permrock.com','https://attacker.invalid'),asOf)).toThrow('source')
 expect(()=>permrockUrl(link.url+'?redirect=x')).toThrow('source')
})
const metaLink={url:'https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-2026-09-10',declaration_date:'2026-09-10'}
const metaText=`<a href="https://www.prnewswire.com/news-releases/meta-announces-quarterly-cash-dividend-302875821.html">Original release</a> The Meta Platforms, Inc. (Nasdaq: META) board of directors today declared a quarterly cash dividend of $0.525 per share of the company's outstanding Class A common stock and Class B common stock, payable on September 28, 2026 to stockholders of record as of the close of business on September 21, 2026. SOURCE Meta`
it('preserves Meta issuer value and leaves ex unconfirmed until independent reconciliation',()=>{
 expect(metaAnnouncement(metaText,metaLink,asOf)).toMatchObject({value_per_share:0.525,record_date:'2026-09-21',payment_date:'2026-09-28'})
 expect(metaAnnouncement(metaText,metaLink,asOf)).not.toHaveProperty('ex_date')
 expect(()=>metaAnnouncement(metaText.replace('SOURCE Meta','SOURCE Other'),metaLink,asOf)).toThrow('identity')
 expect(()=>metaUrl(metaLink.url+'#fake')).toThrow('source')
})
it('binds syndicated declarations to issuer identity and declaration date',()=>{
 const row={title:'Meta Announces Quarterly Cash Dividend',created:'Sep 10, 2026',related_symbols:['meta|stocks'],url:new URL(metaLink.url).pathname}
 expect(metaLinks({status:{rCode:200},data:{rows:[row]}},asOf)).toEqual([metaLink])
 expect(()=>metaLinks({status:{rCode:200},data:{rows:[{...row,related_symbols:['other|stocks']}]}},asOf)).toThrow('identity')
})
it('routes primary sources through their leased endpoint, not Nasdaq calendar storage',async()=>{
 const source=vi.fn();const primary=vi.fn(async()=>[{value_per_share:0.0196242}])
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'PRT',claim_token:'lease'}]}):Response.json({saved:1,conflicts:0,error:null}))
 const result=await collectAnnouncements({endpoint:'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements',token:'fixture',request,source,primarySources:{PRT:primary}})
 expect(result.failed).toBe(0);expect(source).not.toHaveBeenCalled()
 expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({mode:'finish_primary',ticker:'PRT',claim_token:'lease'})
})
