import { validIso } from '../_shared/officialFiles.ts'
export const blackrockIndex='https://www.blackrock.com/us/individual/education/closed-end-funds/press-releases'
const months=['January','February','March','April','May','June','July','August','September','October','November','December']
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim()
function date(s:string) {const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(s);const month=m?months.findIndex(x=>x===m[1]||x.slice(0,3)===m[1]):-1;const value=m?`${m[3]}-${String(month+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:'';if(!validIso(value))throw new Error('issuer_invalid_date');return value}
export function blackrockUrl(url:string) {
 if(!/^https:\/\/www[.]blackrock[.]com\/us\/individual\/literature\/press-release\/[0-9-]+-pr-(?:muni-)?div-release[.]pdf$/.test(url))throw new Error('issuer_invalid_source')
 return url
}
export function blackrockListingUrl(html:string) {
 const links=[...html.matchAll(/url:\s*"(\/us\/individual\/education\/closed-end-funds\/press-releases\/\d+[.]ajax[?]noWrapper=true)"/g)]
 if(links.length!==1)throw new Error('issuer_listing_changed')
 return 'https://www.blackrock.com'+links[0][1]
}
export function blackrockLinks(html:string,asOf:string) {
 if(!validIso(asOf))throw new Error('issuer_invalid_date')
 const links=[]
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const title=clean(row[1]);if(!title.includes('Distribution Dates and Amounts Announced for Certain BlackRock'))continue
  const stamp=/<td[^>]*class="document-publicationdate"[^>]*>([\s\S]*?)<\/td>/.exec(row[1]);const href=/href="([^"]+[.]pdf)"/.exec(row[1])
  if(!stamp||!href)throw new Error('issuer_listing_changed')
  const declaration_date=date(clean(stamp[1]));if(declaration_date>asOf||Date.parse(asOf)-Date.parse(declaration_date)>366*86400000)continue
  links.push({url:blackrockUrl(new URL(href[1],'https://www.blackrock.com').href),declaration_date})
 }
 if(!links.length||links.length>16||new Set(links.map(x=>x.url)).size!==links.length)throw new Error('issuer_listing_changed')
 return links
}
/** Only the municipal table; other fund families have different payment dates. */
export function blackrockMunicipalAnnouncements(text:string,link:{url:string;declaration_date:string},ticker:string,asOf:string) {
 blackrockUrl(link.url)
 if(!/^[A-Z]{2,5}$/.test(ticker)||!validIso(asOf)||!validIso(link.declaration_date)||link.declaration_date>asOf)throw new Error('issuer_invalid_event')
 const s=clean(text);const heading=/New York, (\w+ \d{1,2}, \d{4})\s*[-ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“]/.exec(s)
 if(!s.includes('Distribution Dates and Amounts Announced for Certain BlackRock')||!heading||date(heading[1])!==link.declaration_date)throw new Error('issuer_identity_changed')
 const section=s.split('Municipal Funds:')[1]?.split('Taxable Funds:')[0]
 if(!section){if(new RegExp(`\\b${ticker}\\b`).test(s))throw new Error('issuer_calendar_conflict');return []}
 const fund=[...section.matchAll(new RegExp(`BlackRock ([A-Za-z0-9 ,.&ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢'*-]+?) ${ticker} \\$([0-9]+(?:[.][0-9]{1,8})?)`,'g'))]
 if(!fund.length)return []
 if(fund.length!==1)throw new Error('issuer_ambiguous_distribution')
 const value_per_share=Number(fund[0][2]);if(!(value_per_share>0&&value_per_share<1e6))throw new Error('issuer_invalid_event')
 const d='(\\w+ \\d{1,2}, \\d{4})'
 const events=[...section.matchAll(new RegExp(`(?:${months.join('|')}) ${d} ${d}`,'g'))].map(m=>{
  const ex_date=date(m[1]),payment_date=date(m[2]);if(ex_date<link.declaration_date||payment_date<ex_date||Date.parse(payment_date)-Date.parse(ex_date)>100*86400000)throw new Error('issuer_invalid_event')
  return {declaration_date:link.declaration_date,ex_date,record_date:ex_date,payment_date,value_per_share,source_url:link.url,ex_date_source_url:link.url}
 })
 if(!events.length) {
  const single=/Declaration- (\d{1,2}\/\d{1,2}\/\d{4}) Ex-Date- (\d{1,2}\/\d{1,2}\/\d{4}) Record- (\d{1,2}\/\d{1,2}\/\d{4}) Payable- (\d{1,2}\/\d{1,2}\/\d{4})/.exec(section)
  const us=(x:string)=>{const [m,d,y]=x.split('/');const value=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;if(!validIso(value))throw new Error('issuer_invalid_date');return value}
  if(!single||us(single[1])!==link.declaration_date||us(single[2])!==us(single[3]))throw new Error('issuer_calendar_conflict')
  const ex_date=us(single[2]),payment_date=us(single[4]);if(ex_date<link.declaration_date||payment_date<ex_date||Date.parse(payment_date)-Date.parse(ex_date)>100*86400000)throw new Error('issuer_invalid_event')
  events.push({declaration_date:link.declaration_date,ex_date,record_date:ex_date,payment_date,value_per_share,source_url:link.url,ex_date_source_url:link.url})
 } else if(!section.includes('Ex- & Record Date')||!section.includes('Monthly Distribution'))throw new Error('issuer_calendar_conflict')
 if(!events.length||events.length>3||new Set(events.map(x=>x.ex_date)).size!==events.length)throw new Error('issuer_calendar_conflict')
 return events
}
