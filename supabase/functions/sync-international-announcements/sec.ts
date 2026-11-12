import { validIso } from '../_shared/officialFiles.ts'

const normalized = (s: string) => s.replace(/\./g, '-')
export interface SecIdentity { ticker: string; cik: string }
export interface SecFiling { accession: string; filing_date: string; document: string; source_url: string }
export interface SecAnnouncement extends SecFiling { declaration_date: string; record_date: string; payment_date: string; value_per_share: number; distribution: 'regular' | 'special' }
export function secIdentity(payload: unknown, ticker: string): SecIdentity {
  const p = payload as { fields?: string[]; data?: unknown[][] }
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || JSON.stringify(p?.fields)!==JSON.stringify(['cik','name','ticker','exchange']) || !Array.isArray(p.data) || p.data.length>30000) throw new Error('sec_registry_changed')
  const matches = p.data.filter(r => normalized(String(r[2]))===normalized(ticker) && ['NYSE','Nasdaq'].includes(String(r[3])))
  if (matches.length!==1 || !Number.isSafeInteger(matches[0][0]) || Number(matches[0][0])<=0 || Number(matches[0][0])>9999999999) throw new Error('sec_identity_unavailable')
  return {ticker,cik:String(matches[0][0]).padStart(10,'0')}
}
export function secFilingUrl(cik: string, accession: string, document: string) {
  if (!/^\d{10}$/.test(cik) || !/^\d{10}-\d{2}-\d{6}$/.test(accession) || !/^[a-zA-Z0-9_-]+\.htm[l]?$/.test(document)) throw new Error('sec_invalid_document')
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g,'')}/${document}`
}
export function secFilings(payload: unknown, identity: SecIdentity, asOf: string): { filings: SecFiling[]; truncated: boolean } {
  const p = payload as { cik?: string; tickers?: string[]; filings?: {recent?: Record<string, unknown[]>} }
  const r=p?.filings?.recent
  if (!validIso(asOf) || String(p?.cik).padStart(10,'0')!==identity.cik || !Array.isArray(p.tickers) || !p.tickers.some(t=>normalized(t)===normalized(identity.ticker)) || !r || !Array.isArray(r.form) || r.form.length>20000 || !['accessionNumber','filingDate','primaryDocument','items'].every(k=>Array.isArray(r[k]) && r[k].length===r.form.length)) throw new Error('sec_submissions_identity_changed')
  const since=new Date(Date.parse(asOf)-120*86400000).toISOString().slice(0,10)
  const result: SecFiling[]=[]
  for(let i=0;i<r.form.length;i++) {
    if(r.form[i]!=='8-K' || !String(r.items[i]).split(',').map(s=>s.trim()).includes('8.01'))continue
    const filing_date=String(r.filingDate[i])
    if(!validIso(filing_date) || filing_date>asOf)throw new Error('sec_invalid_date')
    if(filing_date<since)continue
    const accession=String(r.accessionNumber[i]),document=String(r.primaryDocument[i])
    result.push({accession,document,filing_date,source_url:secFilingUrl(identity.cik,accession,document)})
  }
  result.sort((a,b)=>b.filing_date.localeCompare(a.filing_date)||b.accession.localeCompare(a.accession))
  return {filings:result.slice(0,4),truncated:result.length>4}
}
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&#(?:160|xa0);|&nbsp;/gi,' ').replace(/&amp;/g,'&').replace(/&#(?:39|x27);|&apos;|[’‘]/gi,"'").replace(/\s+/g,' ').trim()
const months=['January','February','March','April','May','June','July','August','September','October','November','December']
function date(s:string) {const m=/^(\w+) (\d{1,2}), (\d{4})$/.exec(s);const d=m?`${m[3]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:'';if(!validIso(d))throw new Error('sec_invalid_date');return d}
/** Strict common-stock templates, independent of ticker. Never infers ex-date. */
export function secAnnouncements(html:string,identity:SecIdentity,filing:SecFiling,asOf:string):SecAnnouncement[] {
  if(secFilingUrl(identity.cik,filing.accession,filing.document)!==filing.source_url || !validIso(asOf))throw new Error('sec_invalid_document')
  const field=(name:string)=>[...html.matchAll(new RegExp(`<ix:nonNumeric\\b[^>]*name=["']dei:${name}["'][^>]*>([\\s\\S]*?)<\\/ix:nonNumeric>`,'gi'))].map(m=>clean(m[1]))
  if(!field('EntityCentralIndexKey').some(c=>c.padStart(10,'0')===identity.cik) || !field('TradingSymbol').some(t=>normalized(t)===normalized(identity.ticker)))throw new Error('sec_document_identity_changed')
  const text=clean(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<ix:header\b[^>]*>[\s\S]*?<\/ix:header>/gi,''))
  const d='(\\w+ \\d{1,2}, \\d{4})', amount='(\\d+(?:\\.\\d{1,6})?)'
  const quarterly=new RegExp(`The Board of Directors declared a (quarterly|special) cash dividend on the Company's common stock of \\$${amount} per share\\. The dividend was declared on ${d}, and is payable ${d}, to shareholders of record at the close of business on ${d}\\.`,'g')
  const dated=new RegExp(`On ${d}, the Board of Directors declared a (quarterly|special) cash dividend on the Company's common stock of \\$${amount} per share, payable ${d}, to shareholders of record at the close of business on ${d}\\.`,'g')
  const raw=[...[...text.matchAll(quarterly)].map(m=>({kind:m[1],amount:m[2],declared:m[3],pay:m[4],record:m[5]})),...[...text.matchAll(dated)].map(m=>({declared:m[1],kind:m[2],amount:m[3],pay:m[4],record:m[5]}))]
  if(!raw.length && /declared[^.]{0,250}(?:cash dividend|dividend[^.]{0,80}common stock)/i.test(text))throw new Error('sec_distribution_unsupported')
  if(raw.length>1)throw new Error('sec_ambiguous_distribution')
  return raw.map(e=>{
    const declaration_date=date(e.declared),record_date=date(e.record),payment_date=date(e.pay),value_per_share=Number(e.amount)
    if(declaration_date>filing.filing_date || filing.filing_date>asOf || declaration_date>record_date || record_date>payment_date || value_per_share<=0 || value_per_share>=1e12 || Date.parse(payment_date)-Date.parse(record_date)>366*86400000)throw new Error('sec_invalid_event')
    return {...filing,declaration_date,record_date,payment_date,value_per_share,distribution:e.kind==='special'?'special' as const:'regular' as const}
  })
}
