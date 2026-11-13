import {validIso} from '../_shared/officialFiles.ts'
const months=['January','February','March','April','May','June','July','August','September','October','November','December']
export const craneIndex='https://www.nasdaq.com/api/news/topic/press_release?q=symbol:CR|assetclass:stocks&limit=100&offset=0'
export function craneUrl(url:string){if(!/^https:\/\/www[.]nasdaq[.]com\/press-release\/crane-company-reports-(?:first-quarter|second-quarter|third-quarter|strong-q4)-20\d{2}-[a-z0-9-]+$/.test(url))throw new Error('issuer_invalid_source');return url}
function date(text:string){const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(text);const month=m?months.findIndex(x=>x===m[1]||x.slice(0,3)===m[1]):-1;const value=m?`${m[3]}-${String(month+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:'';if(!validIso(value))throw new Error('issuer_invalid_date');return value}
export function craneLinks(payload:unknown,asOf:string){
 const p=payload as {status?:{rCode?:number};data?:{rows?:{title?:string;created?:string;related_symbols?:string[];url?:string}[]}}
 if(!validIso(asOf)||p.status?.rCode!==200||!Array.isArray(p.data?.rows)||p.data.rows.length>100)throw new Error('issuer_listing_changed')
 const links=[]
 for(const row of p.data.rows){
  if(!/^Crane Company Reports (?:First Quarter|Second Quarter|Third Quarter|Strong Q4) 20\d{2} /.test(row.title??''))continue
  const declaration_date=date(row.created??'');if(declaration_date>asOf||Date.parse(asOf)-Date.parse(declaration_date)>450*86400000)continue
  if(!row.related_symbols?.includes('cr|stocks')||typeof row.url!=='string')throw new Error('issuer_identity_changed')
  links.push({url:craneUrl('https://www.nasdaq.com'+row.url),declaration_date})
 }
 if(!links.length||links.length>6||new Set(links.map(x=>x.url)).size!==links.length)throw new Error('issuer_listing_changed')
 return links
}
export function craneAnnouncement(html:string,link:{url:string;declaration_date:string},asOf:string){
 craneUrl(link.url)
 const text=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/[“”]/g,'"').replace(/\s+/g,' ').replace(/\s+([.,])/g,'$1')
 const upstream=[...html.matchAll(/href="https:\/\/www[.]businesswire[.]com\/news\/home\/(\d{14})\/en\/"/g)]
 const proof=upstream.find(m=>{const d=`${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}`;return validIso(d)&&Date.parse(link.declaration_date)-Date.parse(d)>=0&&Date.parse(link.declaration_date)-Date.parse(d)<=86400000})
 if(!validIso(asOf)||!validIso(link.declaration_date)||link.declaration_date>asOf||!proof||!text.includes('Source: Crane Company')||!/Crane Company \("Crane," NYSE:\s*CR\)/.test(text))throw new Error('issuer_identity_changed')
 const pattern=/[Tt]he (?:regular quarterly dividend of|dividend is payable on)/
 if(!pattern.test(text))throw new Error('issuer_distribution_changed')
 const matches=[...text.matchAll(/(?:Crane announced its regular quarterly dividend of|The regular quarterly dividend of) \$(\d+(?:[.]\d{1,8})?) per share for the (?:first|second|third|fourth) quarter of 20\d{2}(?:[.] The dividend is payable on| is payable on) (\w+ \d{1,2}, \d{4}) to shareholders of record as of (\w+ \d{1,2}, \d{4})[.]/g)]
 if(matches.length!==1)throw new Error('issuer_distribution_changed')
 const value_per_share=Number(matches[0][1]),payment_date=date(matches[0][2]),record_date=date(matches[0][3])
 if(value_per_share<=0||value_per_share>=1e6||link.declaration_date>record_date||record_date>payment_date||Date.parse(payment_date)-Date.parse(record_date)>100*86400000)throw new Error('issuer_invalid_event')
 return {declaration_date:link.declaration_date,record_date,payment_date,value_per_share,source_url:link.url,upstream_url:`https://www.businesswire.com/news/home/${proof[1]}/en/`}
}
