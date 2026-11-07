import { validIso } from '../_shared/officialFiles.ts'
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const text = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim()
const date = (value: string) => {
  const match = /^([A-Z][a-z]{2}) (\d{2}), (\d{4})$/.exec(value)
  const month = match ? months.indexOf(match[1]) + 1 : 0
  const iso = match && month ? `${match[3]}-${String(month).padStart(2,'0')}-${match[2]}` : ''
  if (!validIso(iso)) throw new Error('issuer_invalid_date')
  return iso
}
/** Public fund directory: exact ticker anchor, never a guessed product slug. */
export function isharesDirectory(html: string) {
  const sources = new Map<string, string>()
  const ambiguous = new Set<string>()
  for (const match of html.matchAll(/<a\b[^>]*href="(\/us\/products\/\d+\/[a-z0-9-]+)"[^>]*>\s*([A-Z][A-Z0-9.-]{0,14})\s*<\/a>/g)) {
    const ticker = match[2], url = `https://www.ishares.com${match[1]}`
    if (sources.has(ticker) && sources.get(ticker) !== url) ambiguous.add(ticker)
    sources.set(ticker, url)
  }
  for (const ticker of ambiguous) sources.delete(ticker)
  if (!sources.size) throw new Error('issuer_directory_changed')
  return sources
}
export function isharesDistributions(html: string, ticker: string) {
  const title = text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '')
  if (title.split('|').at(-1)?.trim() !== ticker || !title.includes('iShares')) throw new Error('issuer_identity_mismatch')
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).filter(t=> t.includes('_ws-colExDate') && t.includes('_ws-colPayableDate') && t.includes('_ws-colTotalDistribution'))
  if (tables.length !== 1) throw new Error('issuer_schema_changed')
  const table=tables[0]
  if (!['Record Date','Ex-Date','Payable Date','Total Distribution'].every(h=>table.includes(h))) throw new Error('issuer_schema_changed')
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m=>m[1].includes('<td'))
  if (!rows.length) throw new Error('issuer_empty_table')
  return rows.map(m=> {
    const cells = [...m[1].matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/gi)]
    const cell=(name:string)=>text(cells.find(c=>c[1].split(/\s+/).includes(`_ws-col${name}`))?.[2] ?? '')
    const ex_date=date(cell('ExDate')), payment_date=date(cell('PayableDate')), record_date=date(cell('RecordDate'))
    const raw=cell('TotalDistribution')
    if (!/^\$\d+(?:\.\d+)?$/.test(raw)) throw new Error('issuer_invalid_amount')
    const value_per_share=Number(raw.slice(1))
    if (!Number.isFinite(value_per_share) || value_per_share<=0 || payment_date<ex_date) throw new Error('issuer_invalid_event')
    return {ticker,ex_date,payment_date,record_date,value_per_share,type:'dividend'}
  })
}
