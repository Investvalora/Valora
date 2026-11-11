import { validIso } from '../_shared/officialFiles.ts'

export const jpmOrigin = 'https://www.jpmorganchase.com'
const heading = /^JPMorganChase Declares (?:Increased )?Common Stock Dividend$/
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
function date(s: string): string {
  const m = /^(\w+) (\d{1,2}), (\d{4})$/.exec(s)
  const iso = m ? `${m[3]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}` : ''
  if (!validIso(iso)) throw new Error('jpm_invalid_date')
  return iso
}
export function jpmReleaseUrl(link: string): string {
  if (!/^\/ir\/news\/20\d{2}\/jpmc-declares-(?:increased-)?common-stock-dividend(?:-[a-z0-9-]+)?$/.test(link)) throw new Error('jpm_invalid_source')
  return jpmOrigin + link
}
export interface JpmLink { url: string; declaration_date: string }
/** Public list used by the RI page; preferred stock and intentions are excluded. */
export function jpmReleaseLinks(payload: unknown, asOf: string): { links: JpmLink[]; total: number; pageSize: number } {
  const p = payload as { items?: {title?: unknown;link?: unknown;date?: unknown}[];meta?: {'total-items'?: number; 'page-size'?: number} }
  if (!validIso(asOf) || !Array.isArray(p?.items) || p.items.length>500 || !Number.isSafeInteger(p.meta?.['total-items']) || p.meta!['total-items']!<0 || !Number.isSafeInteger(p.meta?.['page-size']) || p.meta!['page-size']!<1 || p.meta!['page-size']!>500 || p.items.length>p.meta!['page-size']!) throw new Error('jpm_listing_changed')
  const earliest = new Date(Date.parse(asOf)-366*86400000).toISOString().slice(0,10)
  const links: JpmLink[] = []
  for (const item of p.items) {
    if (typeof item.title!=='string') throw new Error('jpm_listing_changed')
    if (!heading.test(item.title)) continue
    if (typeof item.link!=='string' || typeof item.date!=='string') throw new Error('jpm_listing_changed')
    const declaration_date = date(item.date)
    if (declaration_date>asOf) throw new Error('jpm_future_declaration')
    const url = jpmReleaseUrl(item.link)
    if (declaration_date>=earliest) links.push({url,declaration_date})
  }
  return {links,total:p.meta!['total-items']!,pageSize:p.meta!['page-size']!}
}
/** Record is deliberately NOT returned as ex_date. The DB must reconcile it. */
export function jpmAnnouncement(html: string, link: JpmLink, asOf: string) {
  const u = new URL(link.url)
  if (jpmReleaseUrl(u.pathname)!==link.url) throw new Error('jpm_invalid_source')
  const titles = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
  const dates = [...html.matchAll(/<p\b[^>]*class="[^"]*\bcardText\b[^"]*\bdate\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
  if (titles.length!==1 || !heading.test(clean(titles[0][1])) || dates.length!==1 || date(clean(dates[0][1]))!==link.declaration_date) throw new Error('jpm_identity_changed')
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1])).filter(p=>p.includes('declared a quarterly dividend'))
  if (paragraphs.length!==1 || !paragraphs[0].includes('JPMorgan Chase & Co. (NYSE: JPM)')) throw new Error('jpm_distribution_changed')
  const amount = /declared a quarterly dividend of \$(\d+(?:\.\d{1,6})?) per share on the outstanding shares of the common stock of JPMorganChase\b/.exec(paragraphs[0])
  const datesMatch = /The dividend is payable on (\w+ \d{1,2}, \d{4}), to stockholders of record at the close of business on (\w+ \d{1,2}, \d{4})\./.exec(paragraphs[0])
  if (!amount || !datesMatch) throw new Error('jpm_distribution_changed')
  const value_per_share=Number(amount[1]),payment_date=date(datesMatch[1]),record_date=date(datesMatch[2])
  if (!validIso(asOf) || value_per_share<=0 || value_per_share>=1e12 || link.declaration_date>asOf || link.declaration_date>record_date || payment_date<record_date || Date.parse(payment_date)-Date.parse(record_date)>366*86400000) throw new Error('jpm_invalid_event')
  return {declaration_date:link.declaration_date,record_date,payment_date,value_per_share,source_url:link.url}
}
