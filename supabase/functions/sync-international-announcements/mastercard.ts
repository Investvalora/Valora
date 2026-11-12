import { validIso } from '../_shared/officialFiles.ts'
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export interface MaLink { source_url: string; declaration_date: string }
export function maReleaseUrl(path: string) {
  if (!/^\/press-release\/mastercard-board-directors-announces-quarterly-dividend-20\d{2}-\d{2}-\d{2}$/.test(path)) throw new Error('ma_invalid_source')
  return `https://www.nasdaq.com${path}`
}
/** Only issuer declarations, not articles that merely mention MA. */
export function maReleaseLinks(payload: unknown, asOf: string): MaLink[] {
  const p=payload as {status?:{rCode?:number};data?:{rows?:{title?:string;created?:string;url?:string;related_symbols?:string[]}[]}}
  if(!validIso(asOf)||p?.status?.rCode!==200||!Array.isArray(p.data?.rows)||p.data.rows.length>100)throw new Error('ma_listing_changed')
  const links: MaLink[]=[]
  for(const row of p.data.rows){
    if(row.title!=='Mastercard Board of Directors Announces Quarterly Dividend')continue
    const m=/^(\w{3}) (\d{1,2}), (\d{4})$/.exec(row.created??'')
    const date=m?`${m[3]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:''
    if(!validIso(date)||date>asOf||!row.related_symbols?.includes('ma|stocks')||typeof row.url!=='string')throw new Error('ma_identity_changed')
    const source_url=maReleaseUrl(row.url)
    if(!source_url.endsWith(date))throw new Error('ma_identity_changed')
    if(Date.parse(asOf)-Date.parse(date)<=366*86400000)links.push({source_url,declaration_date:date})
  }
  if(new Set(links.map(x=>x.source_url)).size!==links.length)throw new Error('ma_ambiguous_listing')
  return links.sort((a,b)=>b.declaration_date.localeCompare(a.declaration_date)).slice(0,2)
}
export function maAnnouncement(html: string, link: MaLink, asOf: string) {
  if(maReleaseUrl(new URL(link.source_url).pathname)!==link.source_url||!link.source_url.endsWith(link.declaration_date)||!validIso(asOf)||link.declaration_date>asOf)throw new Error('ma_invalid_source')
  const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ')
  const upstream=[...html.matchAll(/href="https:\/\/www\.businesswire\.com\/news\/home\/(\d{14})\/en\/"/g)]
  if(!upstream.length||!upstream.every(x=>x[1].startsWith(link.declaration_date.replace(/-/g,'')))||!clean.includes('Source: Mastercard Investor Relations'))throw new Error('ma_identity_changed')
  const pattern=/Mastercard Incorporated \(NYSE: MA\) today announced that its Board of Directors has declared a quarterly cash dividend of (\d+(?:\.\d+)?) cents per share\. The cash dividend will be paid on (\w+ \d{1,2}, \d{4}) to holders of record of its Class A common stock and Class B common stock as of (\w+ \d{1,2}, \d{4})\./g
  const matches=[...clean.replace(/\s+([.,])/g,'$1').matchAll(pattern)]
  if(matches.length!==1)throw new Error('ma_distribution_changed')
  const parse=(s:string)=>{const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(s);const iso=m?`${m[3]}-${String(months.findIndex(x=>m[1].startsWith(x))+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:'';if(!validIso(iso))throw new Error('ma_invalid_date');return iso}
  const value_per_share=Number(matches[0][1])/100,payment_date=parse(matches[0][2]),record_date=parse(matches[0][3])
  if(value_per_share<=0||value_per_share>=1000||link.declaration_date>record_date||payment_date<record_date||Date.parse(payment_date)-Date.parse(record_date)>366*86400000)throw new Error('ma_invalid_event')
  // Deliberately no ex-date: storage requires an independent existing anchor.
  return {...link,record_date,payment_date,value_per_share}
}
