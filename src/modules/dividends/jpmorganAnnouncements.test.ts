import { expect, it, vi } from 'vitest'
import { jpmAnnouncement, jpmReleaseLinks, jpmReleaseUrl } from '../../../supabase/functions/sync-international-announcements/jpmorgan.ts'
// @ts-expect-error Standalone Node runner.
import { jpmorganAnnouncements } from '../../../scripts/jpmorgan-announcements.mjs'
const asOf='2026-11-11'
const link={url:'https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15',declaration_date:'2026-09-15'}
const article='<h1>JPMorganChase Declares Increased Common Stock Dividend</h1><p class="cardText date no-quote">September 15, 2026</p><p>The Board of Directors of JPMorgan Chase &amp; Co. (NYSE: JPM) declared a quarterly dividend of $1.65 per share on the outstanding shares of the common stock of JPMorganChase. The dividend is payable on October 31, 2026, to stockholders of record at the close of business on October 6, 2026.</p>'
const item={title:'JPMorganChase Declares Increased Common Stock Dividend',date:'September 15, 2026',link:new URL(link.url).pathname}
const listing={items:[item],meta:{'total-items':1,'page-size':240}}
it('discovers declared common-stock releases and excludes preferred shares and intentions',()=>{
 const p={...listing,items:[item,{...item,title:'JPMorganChase Declares Preferred Stock Dividends'},{...item,title:'JPMorganChase Plans Dividend Increase'}]}
 expect(jpmReleaseLinks(p,asOf).links).toEqual([link])
})
it('extracts gross declared amount/dates without inventing an ex-date',()=>{
 const e=jpmAnnouncement(article,link,asOf)
 expect(e).toMatchObject({value_per_share:1.65,record_date:'2026-10-06',payment_date:'2026-10-31',source_url:link.url})
 expect(e).not.toHaveProperty('ex_date');expect(e).not.toHaveProperty('net_amount')
})
it.each(['https://attacker.invalid/ir/news/2026/x','//attacker.invalid/x','/ir/news/2026/jpmc-declares-preferred-stock-dividends','/ir/news/2026/../secret','/ir/news/2026/jpmc-declares-common-stock-dividend?redirect=x'])('refuses unsafe or wrong-class release links %s',url=>{expect(()=>jpmReleaseUrl(url)).toThrow('source')})
it.each([
 article.replace('NYSE: JPM','NYSE: MA'),article.replace('common stock of JPMorganChase','preferred stock of JPMorganChase'),article.replace('declared a quarterly','intends to declare a quarterly'),article.replace('September 15, 2026','September 16, 2026'),article.replace('October 31, 2026','September 31, 2026'),article.replace('$1.65','$0.00'),article+article,
])('fails closed on identity, class, chronology, amount and schema changes',html=>{expect(()=>jpmAnnouncement(html,link,asOf)).toThrow()})
it('refuses future declarations and malformed listing metadata',()=>{
 expect(()=>jpmReleaseLinks(listing,'2026-09-14')).toThrow('future')
 expect(()=>jpmReleaseLinks({...listing,meta:{}},asOf)).toThrow('listing')
})
it('follows only discovered links and bounds a full discovery window',async()=>{
 const read=vi.fn(async(url:string)=>url.includes('/services/')?JSON.stringify(listing):article)
 expect(await jpmorganAnnouncements(asOf,read)).toHaveLength(1)
 expect(read).toHaveBeenCalledTimes(2);expect(read.mock.calls[1][0]).toBe(link.url)
 const empty=vi.fn(async()=>JSON.stringify({items:[],meta:{'total-items':10000,'page-size':240}}))
 await expect(jpmorganAnnouncements(asOf,empty)).rejects.toThrow('window_empty');expect(empty).toHaveBeenCalledTimes(4)
})
