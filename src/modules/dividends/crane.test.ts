import{expect,it}from'vitest'
import{craneAnnouncement,craneLinks,craneUrl}from'../../../supabase/functions/sync-international-announcements/crane'
const link={url:'https://www.nasdaq.com/press-release/crane-company-reports-second-quarter-2026-results-and-raises-full-year-adjusted-eps',declaration_date:'2026-07-28'}
const html=`<a href="https://www.businesswire.com/news/home/20260728065272/en/">Source</a> Crane Company ("Crane," NYSE:CR) Source: Crane Company
Crane announced its regular quarterly dividend of $0.255 per share for the third quarter of 2026. The dividend is payable on September 9, 2026 to shareholders of record as of August 31, 2026.`
it('extracts the official value and payment without inventing an ex-date',()=>{
 const e=craneAnnouncement(html,link,'2026-11-13')
 expect(e).toMatchObject({value_per_share:0.255,payment_date:'2026-09-09',record_date:'2026-08-31',declaration_date:'2026-07-28'})
 expect(e).not.toHaveProperty('ex_date');expect(e.upstream_url).toContain('businesswire.com/news/home/20260728')
})
it('rejects changed issuer, origin, date and duplicated distribution',()=>{
 for(const bad of [html.replace('NYSE:CR','NYSE:OTHER'),html.replace('Source: Crane Company','Source: Other'),html.replace('20260728065272','20260725065272'),html+html])expect(()=>craneAnnouncement(bad,link,'2026-11-13')).toThrow()
 expect(()=>craneUrl('https://attacker.invalid/'+link.url)).toThrow('source')
})
it('supports the first-quarter template and prior-day Business Wire timestamp',()=>{
 const first=html.replace('20260728065272','20260125013731').replace('Crane announced its','The').replace('third quarter','first quarter').replace('2026. The dividend is payable on September 9, 2026','2026 is payable on March 11, 2026').replace('August 31, 2026','February 27, 2026')
 expect(craneAnnouncement(first,{url:link.url.replace('second-quarter-2026-results-and-raises-full-year-adjusted-eps','strong-q4-2025-performance-initiates-2026-guidance-completes'),declaration_date:'2026-01-26'},'2026-11-13').payment_date).toBe('2026-03-11')
})
it('includes prior-year declarations whose payments still fall in the history window',()=>{
 const row={title:'Crane Company Reports Third Quarter 2025 Results',created:'Oct 27, 2025',related_symbols:['cr|stocks'],url:'/press-release/crane-company-reports-third-quarter-2025-results-raises-and-narrows-full-year'}
 const payload={status:{rCode:200},data:{rows:[row]}}
 expect(craneLinks(payload,'2026-11-13')).toHaveLength(1)
 expect(()=>craneLinks({status:{rCode:200},data:{rows:[{...row,related_symbols:['cxt|stocks']}]}},'2026-11-13')).toThrow('identity')
})
