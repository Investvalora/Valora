import { expect, it, vi } from 'vitest'
import { jnjIndex, jnjLinks, jnjAnnouncement, jnjUrl } from '../../../supabase/functions/sync-international-announcements/jnj'
// @ts-expect-error Standalone Node collector.
import { jnjAnnouncements } from '../../../scripts/jnj-announcements.mjs'
// @ts-expect-error Standalone Node collector.
import { collectAnnouncements } from '../../../scripts/collect-international-announcements.mjs'
const asOf = '2026-11-13'
const url = 'https://www.nasdaq.com/press-release/johnson-johnson-announces-quarterly-dividend-fourth-quarter-2026-2026-10-13'
const link = { url, declaration_date: '2026-10-13' }
const row = { title: 'Johnson & Johnson Announces Quarterly Dividend for Fourth Quarter 2026', created: 'Oct 13, 2026', related_symbols: ['jnj|stocks'], url: url.replace('https://www.nasdaq.com','') }
const listing = (rows: unknown[]) => ({ status: { rCode: 200 }, data: { rows } })
const html = `<a href="https://www.businesswire.com/news/home/20261013101430/en/">Release</a><p>Johnson & Johnson (NYSE: JNJ) today announced that its Board of Directors has declared a cash dividend for the fourth quarter of 2026 of $1.34 per share on the company’s common stock. The dividend is payable on December 8, 2026 to shareholders of record at the close of business on November 24, 2026. The ex-dividend date is November 24, 2026. Source: Johnson & Johnson</p>`

it('discovers dated issuer releases and reads explicit ex-date without inferring from record', async () => {
  const read = vi.fn(async (target: string) => target === jnjIndex ? JSON.stringify(listing([row])) : html)
  expect(await jnjAnnouncements(asOf, read)).toEqual([{ declaration_date: link.declaration_date, source_url: url, ex_date_source_url: url, upstream_url: 'https://www.businesswire.com/news/home/20261013101430/en/', ex_date: '2026-11-24', record_date: '2026-11-24', payment_date: '2026-12-08', value_per_share: 1.34 }])
  expect(read).toHaveBeenCalledTimes(2)
})
it.each([
  html.replace('The ex-dividend date is November 24, 2026.',''),
  html.replace('NYSE: JNJ','NYSE: OTHER'),
  html.replace('Source: Johnson & Johnson','Source: Someone Else'),
  html.replace('20261013101430','20261012101430'),
  html.replace('https://www.businesswire.com','https://attacker.invalid'),
  html.replace('December 8, 2026','November 1, 2026'),
  html.replace('November 24, 2026. Source:', 'February 30, 2026. Source:'),
  html.replace('$1.34','$0.00'),
  html + html,
])('rejects missing or inconsistent source/calendar evidence', candidate => {
  expect(() => jnjAnnouncement(candidate, link, asOf)).toThrow()
})
it('reads the new quarterly amount from the annual increase announcement', () => {
  const annual = html.replace('has declared a cash dividend for the fourth quarter of 2026 of $1.34 per share on the company’s common stock.', 'has declared a 3.1% increase in the quarterly dividend, from $1.30 per share to $1.34 per share, marking the 64th year.').replace('The dividend is payable','The next quarterly dividend is payable')
  expect(jnjAnnouncement(annual, link, asOf).value_per_share).toBe(1.34)
})
it.each([
  { ...row, related_symbols: ['other|stocks'] },
  { ...row, url: row.url.replace('2026-10-13','2026-10-12') },
  { ...row, created: 'Feb 30, 2026' },
])('rejects wrong issuer/date in discovery', candidate => {
  expect(() => jnjLinks(listing([candidate]), asOf)).toThrow()
})
it('rejects duplicate or empty discovery and foreign URLs', () => {
  expect(() => jnjLinks(listing([row,row]), asOf)).toThrow()
  expect(() => jnjLinks(listing([]), asOf)).toThrow()
  expect(() => jnjUrl(url.replace('www.nasdaq.com','attacker.invalid'))).toThrow()
})
it('routes JNJ through its primary collector while preserving its lease', async () => {
  const source = vi.fn()
  const primary = vi.fn(async () => [jnjAnnouncement(html, link, asOf)])
  const request = vi.fn(async (_url: string, init: RequestInit) => JSON.parse(String(init.body)).mode === 'claim' ? Response.json({ tasks: [{ ticker: 'JNJ', claim_token: 'fixture-lease' }] }) : Response.json({ saved: 1, error: null }))
  const result = await collectAnnouncements({ endpoint: 'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements', token: 'fixture', source, primarySources: { JNJ: primary }, request })
  expect(result.failed).toBe(0)
  expect(source).not.toHaveBeenCalled()
  expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({ mode: 'finish_primary', ticker: 'JNJ', claim_token: 'fixture-lease' })
})
