import { validIso } from '../_shared/officialFiles.ts'
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const metaIndex='https://www.nasdaq.com/api/news/topic/press_release?q=symbol:META|assetclass:stocks&limit=100&offset=0'
export function metaUrl(url:string) {
  if(!/^https:\/\/www[.]nasdaq[.]com\/press-release\/meta-announces-quarterly-cash-dividend-20\d{2}-\d{2}-\d{2}$/.test(url))throw new Error('issuer_invalid_source')
  return url
}
function date(text:string) {const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(text);const s=m?`${m[3]}-${String(months.findIndex(x=>m[1].startsWith(x))+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:'';if(!validIso(s))throw new Error('issuer_invalid_date');return s}
export function metaLinks(payload:unknown,asOf:string) {
  const p=payload as {status?:{rCode?:number};data?:{rows?:{title?:string;created?:string;related_symbols?:string[];url?:string}[]}}
  if(!validIso(asOf)||p.status?.rCode!==200||!Array.isArray(p.data?.rows)||p.data.rows.length>100)throw new Error('issuer_listing_changed')
  const links=[]
  for(const row of p.data.rows) {
    if(row.title!=='Meta Announces Quarterly Cash Dividend')continue
    const declaration_date=date(row.created??'');const url=metaUrl('https://www.nasdaq.com'+row.url)
    if(!row.related_symbols?.includes('meta|stocks')||!url.endsWith(declaration_date)||declaration_date>asOf)throw new Error('issuer_identity_changed')
    if(Date.parse(asOf)-Date.parse(declaration_date)<=366*86400000)links.push({url,declaration_date})
  }
  if(!links.length||links.length>5||new Set(links.map(x=>x.url)).size!==links.length)throw new Error('issuer_listing_changed')
  return links
}
export function metaAnnouncement(html:string,link:{url:string;declaration_date:string},asOf:string) {
  metaUrl(link.url)
  const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').replace(/\s+([.,)])/g,'$1')
  if(!html.includes('https://www.prnewswire.com/news-releases/meta-announces-quarterly-cash-dividend-')||!clean.includes('SOURCE Meta')||!link.url.endsWith(link.declaration_date)||link.declaration_date>asOf)throw new Error('issuer_identity_changed')
  const matches=[...clean.matchAll(/The Meta Platforms, Inc\. \(Nasdaq: META\) board of directors today declared a quarterly cash dividend of \$(\d+(?:\.\d{1,8})?) per share of the company's outstanding Class A common stock and Class B common stock, payable on (\w+ \d{1,2}, \d{4}) to stockholders of record as of the close of business on (\w+ \d{1,2}, \d{4})\./g)]
  if(matches.length!==1)throw new Error('issuer_distribution_changed')
  const value_per_share=Number(matches[0][1]),payment_date=date(matches[0][2]),record_date=date(matches[0][3])
  if(value_per_share<=0||value_per_share>=1e6||link.declaration_date>record_date||record_date>payment_date||Date.parse(payment_date)-Date.parse(record_date)>366*86400000)throw new Error('issuer_invalid_event')
  return {declaration_date:link.declaration_date,record_date,payment_date,value_per_share,source_url:link.url}
}
