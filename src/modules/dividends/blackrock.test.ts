import {describe,it,expect} from 'vitest'
import {blackrockLinks,blackrockListingUrl,blackrockMunicipalAnnouncements} from '../../../supabase/functions/sync-international-announcements/blackrock'
const url='https://www.blackrock.com/us/individual/literature/press-release/9-10-2026-pr-div-release.pdf'
const link={url,declaration_date:'2026-09-10'}
const text=`Distribution Dates and Amounts Announced for Certain BlackRock Closed-End Funds
New York, September 10, 2026 - Certain BlackRock closed-end funds announced distributions.
Municipal Funds: Distribution Month Ex- & Record Date Payable Date
October October 15, 2026 November 2, 2026 November November 13, 2026 December 1, 2026 December December 11, 2026 December 22, 2026
National Funds Ticker Monthly Distribution Change From Prior Distribution
BlackRock 2037 Municipal Target Term Trust BMN $0.099250 +0.00550
Taxable Funds: October October 15, 2026 October 30, 2026`
describe('BlackRock primary municipal calendar',()=>{
 it('keeps exact value and municipal payment, including declared future dates',()=>{
  const events=blackrockMunicipalAnnouncements(text,link,'BMN','2026-11-12')
  expect(events).toHaveLength(3);expect(events[0]).toMatchObject({ex_date:'2026-10-15',record_date:'2026-10-15',payment_date:'2026-11-02',value_per_share:0.09925})
  expect(events[2].payment_date).toBe('2026-12-22')
 })
 it('rejects changed identity, calendar proof, date or duplicate ticker',()=>{
  expect(()=>blackrockMunicipalAnnouncements(text.replace('September 10','September 11'),link,'BMN','2026-11-12')).toThrow('identity')
  expect(()=>blackrockMunicipalAnnouncements(text.replace('Ex- & Record Date','Record Date'),link,'BMN','2026-11-12')).toThrow('calendar')
  expect(()=>blackrockMunicipalAnnouncements(text.replace('November 2, 2026','September 2, 2026'),link,'BMN','2026-11-12')).toThrow('invalid_event')
  expect(()=>blackrockMunicipalAnnouncements(text.replace('Taxable Funds:','BlackRock Other BMN $0.1 Taxable Funds:'),link,'BMN','2026-11-12')).toThrow('ambiguous')
 })
 it('does not assign a municipal calendar to another fund',()=>expect(blackrockMunicipalAnnouncements(text,link,'BKT','2026-11-12')).toEqual([]))
 it('supports older explicit separate ex and record columns without inferring equivalence',()=>{
  const old=text.replace('September 10, 2026','December 12, 2025').replace(/Distribution Month[\s\S]*?National Funds/,'Declaration- 12/12/2025 Ex-Date- 12/22/2025 Record- 12/22/2025 Payable- 12/31/2025 National Funds')
  const oldLink={url:url.replace('9-10-2026','12-12-25'),declaration_date:'2025-12-12'}
  expect(blackrockMunicipalAnnouncements(old,oldLink,'BMN','2026-11-12')[0].ex_date).toBe('2025-12-22')
  expect(()=>blackrockMunicipalAnnouncements(old.replace('Record- 12/22','Record- 12/23'),oldLink,'BMN','2026-11-12')).toThrow('calendar')
 })
 it('discovers only dated official PDF links and listing endpoint',()=>{
  const html=`<tr><td class="document-publicationdate">Sep 10, 2026</td><td><a href="${url}">Distribution Dates and Amounts Announced for Certain BlackRock Closed-End Funds</a></td></tr>`
  expect(blackrockLinks(html,'2026-11-12')).toEqual([link])
  expect(()=>blackrockLinks(html.replace('www.blackrock.com','attacker.invalid'),'2026-11-12')).toThrow('source')
  expect(()=>blackrockListingUrl('url: "https://attacker.invalid/x"')).toThrow('listing')
  expect(blackrockListingUrl('url: "/us/individual/education/closed-end-funds/press-releases/123.ajax?noWrapper=true"')).toContain('/123.ajax?')
 })
})
