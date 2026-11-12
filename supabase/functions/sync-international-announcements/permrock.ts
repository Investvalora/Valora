import { validIso } from '../_shared/officialFiles.ts'

export const permrockOrigin = 'https://permrock.com'
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const clean = (s: string) => s.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim()
function iso(text: string) {
  const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(text)
  const value=m?`${m[3]}-${String(months.findIndex(x=>x===m[1]||x.slice(0,3)===m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:''
  if(!validIso(value))throw new Error('issuer_invalid_date')
  return value
}
function us(text: string) { const [m,d,y]=text.split('-');const value=`${y}-${m}-${d}`;if(!validIso(value))throw new Error('issuer_invalid_date');return value }
export function permrockUrl(url: string) {
  if(!/^https:\/\/permrock[.]com\/wp-content\/uploads\/20\d{2}\/\d{2}\/[A-Za-z0-9-]+[.]pdf$/.test(url))throw new Error('issuer_invalid_source')
  return url
}
export function permrockLinks(html: string, asOf: string) {
  if(!validIso(asOf)||!clean(html).includes('PermRock Royalty Trust'))throw new Error('issuer_identity_changed')
  const since=new Date(Date.parse(asOf)-366*86400000).toISOString().slice(0,10)
  const result=new Map<string,{url:string;declaration_date:string}>()
  for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title=clean(m[2]);const date=/^(\w+ \d{1,2}, \d{4})\s+PermRock Royalty Trust Declares Monthly Cash Distribution$/.exec(title)
    if(!date)continue
    const declaration_date=iso(date[1]);if(declaration_date>asOf||declaration_date<since)continue
    result.set(m[1],{url:permrockUrl(m[1]),declaration_date})
  }
  if(!result.size||result.size>14)throw new Error('issuer_listing_changed')
  return [...result.values()].sort((a,b)=>b.declaration_date.localeCompare(a.declaration_date))
}
/** Ex is established by the issuer's explicitly combined Ex-Div / Record column. */
export function permrockCalendar(html:string,asOf:string) {
  const text=clean(html)
  if(!text.includes('Ex-Div / Record Date')||!text.includes('ex-dates the same as the record date'))throw new Error('issuer_ex_evidence_missing')
  const result=new Map<string,{ex_date:string;payment_date:string;value:number}>()
  for(const block of text.split(/PermRock Royalty TRUST \d{4} CALENDAR/).slice(1)) {
    for(const m of block.matchAll(/(?:January|February|March|April|May|June|July|August|September|October|November|December) (\d{2}-\d{2}-\d{4}) \*\* (\d{2}-\d{2}-\d{4}) (\d{2}-\d{2}-\d{4}) \$\s*(\d+(?:\.\d{1,8})?)/g)) {
      const declared=us(m[1]),ex_date=us(m[2]),payment_date=us(m[3]);if(declared>asOf||ex_date<'2024-05-28')continue
      if(result.has(declared))throw new Error('issuer_ambiguous_calendar')
      result.set(declared,{ex_date,payment_date,value:Number(m[4])})
    }
  }
  return result
}
export function permrockAnnouncement(pdfText:string,link:{url:string;declaration_date:string},calendar:ReturnType<typeof permrockCalendar>,asOf:string) {
  permrockUrl(link.url)
  const text=clean(pdfText).replace(/\s+,/g,',').replace(/\bpayable o\s+n\b/g,'payable on').replace(/\bam\s+ount\b/g,'amount')
  const d='(\\w+ \\d{1,2}, \\d{4})'
  const declaration=new RegExp(`DALLAS, Texas, ${d} .{0,10}PermRock Royalty Trust \\(NYSE:\\s*PRT\\)` ).exec(text)
  const matches=[...text.matchAll(new RegExp(`as of ${d}, and payable on ${d}, in the amount of \\$\\s*[\\d,.]+ \\(\\$\\s*(\\d+(?:\\.\\d{1,8})?) per Trust Unit\\)`,'g'))]
  if(!declaration||iso(declaration[1])!==link.declaration_date||matches.length!==1||!text.includes('declared a monthly cash distribution'))throw new Error('issuer_distribution_changed')
  const record_date=iso(matches[0][1]),payment_date=iso(matches[0][2]),value_per_share=Number(matches[0][3]),proof=calendar.get(link.declaration_date)
  if(!proof||proof.ex_date!==record_date||proof.payment_date!==payment_date||proof.value.toFixed(6)!==value_per_share.toFixed(6))throw new Error('issuer_calendar_conflict')
  if(link.declaration_date>asOf||link.declaration_date>record_date||record_date>payment_date||value_per_share<=0||value_per_share>=1e6)throw new Error('issuer_invalid_event')
  return {declaration_date:link.declaration_date,ex_date:proof.ex_date,record_date,payment_date,value_per_share,source_url:link.url,ex_date_source_url:`${permrockOrigin}/cash-distributions/`}
}
