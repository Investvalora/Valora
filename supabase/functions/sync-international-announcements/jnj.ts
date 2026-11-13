import { validIso } from '../_shared/officialFiles.ts'
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const jnjIndex = 'https://www.nasdaq.com/api/news/topic/press_release?q=symbol:JNJ|assetclass:stocks&limit=100&offset=0'
export function jnjUrl(url: string) {
  if (!/^https:\/\/www[.]nasdaq[.]com\/press-release\/johnson-johnson-announces-(?:quarterly-dividend-(?:first|second|third|fourth)-quarter-20\d{2}-20\d{2}-\d{2}-\d{2}|\d{2}th-consecutive-year-dividend-increase-raises-quarterly)$/.test(url)) throw new Error('issuer_invalid_source')
  return url
}
function date(text: string) {
  const m = /^(\w+) (\d{1,2}), (\d{4})$/.exec(text)
  const month = m ? months.findIndex(x => x === m[1] || x.slice(0,3) === m[1]) : -1
  const value = m ? `${m[3]}-${String(month+1).padStart(2,'0')}-${m[2].padStart(2,'0')}` : ''
  if (!validIso(value)) throw new Error('issuer_invalid_date')
  return value
}
export function jnjLinks(payload: unknown, asOf: string) {
  const p = payload as { status?: { rCode?: number }; data?: { rows?: { title?: string; created?: string; related_symbols?: string[]; url?: string }[] } }
  if (!validIso(asOf) || p.status?.rCode !== 200 || !Array.isArray(p.data?.rows) || p.data.rows.length > 100) throw new Error('issuer_listing_changed')
  const links = []
  for (const row of p.data.rows) {
    if (!/^Johnson & Johnson Announces (?:Quarterly Dividend for (?:First|Second|Third|Fourth) Quarter 20\d{2}|\d{2}th Consecutive Year of Dividend Increase; Raises Quarterly Dividend by \d+(?:[.]\d+)?%)$/.test(row.title ?? '')) continue
    const declaration_date = date(row.created ?? '')
    if (declaration_date > asOf || Date.parse(asOf)-Date.parse(declaration_date) > 366*86400000) continue
    if (!row.related_symbols?.includes('jnj|stocks') || typeof row.url !== 'string') throw new Error('issuer_identity_changed')
    const url = jnjUrl('https://www.nasdaq.com'+row.url)
    if (/quarter-20\d{2}-/.test(url) && !url.endsWith(declaration_date)) throw new Error('issuer_identity_changed')
    links.push({ url, declaration_date })
  }
  if (!links.length || links.length > 5 || new Set(links.map(x=>x.url)).size !== links.length) throw new Error('issuer_listing_changed')
  return links
}
export function jnjAnnouncement(html: string, link: { url: string; declaration_date: string }, asOf: string) {
  jnjUrl(link.url)
  const text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').replace(/\s+([.,])/g,'$1')
  const proofs = [...html.matchAll(/href="https:\/\/www[.]businesswire[.]com\/news\/home\/(\d{14})\/en\/"/g)]
  const proof = proofs.find(m => `${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}` === link.declaration_date)
  if (!validIso(asOf) || !validIso(link.declaration_date) || link.declaration_date > asOf || !proof || !text.includes('Source: Johnson & Johnson') || !text.includes('Johnson & Johnson (NYSE: JNJ)')) throw new Error('issuer_identity_changed')
  const amounts = [...text.matchAll(/declared a cash dividend for the (?:first|second|third|fourth) quarter of 20\d{2} of \$(\d+(?:[.]\d{1,8})?) per share on the company[’']s common stock[.]/g)]
  const increases = [...text.matchAll(/increase in the quarterly dividend, from \$\d+(?:[.]\d{1,8})? per share to \$(\d+(?:[.]\d{1,8})?) per share/g)]
  const values = [...amounts, ...increases]
  const dates = [...text.matchAll(/(?:The dividend|The next quarterly dividend) is payable on (\w+ \d{1,2}, \d{4}) to shareholders of record at the close of business on (\w+ \d{1,2}, \d{4})[.] The ex-dividend date is (\w+ \d{1,2}, \d{4})[.]/g)]
  if (values.length !== 1 || dates.length !== 1) throw new Error('issuer_distribution_changed')
  const value_per_share = Number(values[0][1]), payment_date = date(dates[0][1]), record_date = date(dates[0][2]), ex_date = date(dates[0][3])
  if (value_per_share <= 0 || value_per_share >= 1e6 || link.declaration_date > ex_date || ex_date > record_date || record_date > payment_date || Date.parse(payment_date)-Date.parse(ex_date)>100*86400000) throw new Error('issuer_invalid_event')
  return { declaration_date: link.declaration_date, ex_date, record_date, payment_date, value_per_share, source_url: link.url, ex_date_source_url: link.url, upstream_url: `https://www.businesswire.com/news/home/${proof[1]}/en/` }
}
