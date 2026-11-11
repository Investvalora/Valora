import { validIso } from '../_shared/officialFiles.ts'

export function nasdaqIdentity(payload: unknown, ticker: string): void {
  const p = payload as { status?: { rCode?: number }; data?: { symbol?: string; stockType?: string; isNasdaqListed?: boolean; assetClass?: string } }
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || p?.status?.rCode !== 200 || p.data?.symbol !== ticker
    || p.data.stockType !== 'Common Stock' || p.data.isNasdaqListed !== true || p.data.assetClass !== 'STOCKS') throw new Error('nasdaq_identity_unsupported')
}
function date(value: unknown): string {
  const m = typeof value === 'string' && /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const iso = m ? `${m[3]}-${m[1]}-${m[2]}` : ''
  if (!validIso(iso)) throw new Error('nasdaq_invalid_date')
  return iso
}
export interface Announcement { ex_date: string; record_date: string; payment_date: string; declaration_date: string; value_per_share: number }
/** Header summaries can be stale. Only dated USD cash rows are eligible.
 * Identity must first be checked against the separate quote/info response. */
export function nasdaqAnnouncements(payload: unknown, asOf: string): Announcement[] {
  const p = payload as { status?: { rCode?: number }; data?: { dividends?: { rows?: Record<string, unknown>[] } } }
  const rows = p?.data?.dividends?.rows
  if (!validIso(asOf) || p?.status?.rCode !== 200 || !Array.isArray(rows) || rows.length === 0 || rows.length > 1000) throw new Error('nasdaq_unavailable')
  const result: Announcement[] = []; const seen = new Set<string>()
  const earliest = new Date(Date.parse(asOf)-366*86400000).toISOString().slice(0,10)
  for (const row of rows) {
    const ex_date = date(row.exOrEffDate)
    // Old, non split-adjusted history is deliberately not ingested.
    if (ex_date < earliest) continue
    const record_date = date(row.recordDate), payment_date = date(row.paymentDate), declaration_date = date(row.declarationDate)
    if (row.type !== 'Cash' || row.currency !== 'USD' || typeof row.amount !== 'string' || !/^\$\d+(\.\d{1,6})?$/.test(row.amount)) throw new Error('nasdaq_unsupported_distribution')
    const value_per_share = Number(row.amount.slice(1))
    if (value_per_share <= 0 || !Number.isFinite(value_per_share) || value_per_share >= 1e12 || declaration_date > asOf || declaration_date > ex_date
      || record_date < ex_date || payment_date < record_date || Date.parse(ex_date)-Date.parse(asOf)>366*86400000
      || Date.parse(payment_date)-Date.parse(ex_date)>366*86400000) throw new Error('nasdaq_invalid_event')
    if (seen.has(ex_date)) throw new Error('nasdaq_ambiguous_distribution')
    seen.add(ex_date); result.push({ ex_date, record_date, payment_date, declaration_date, value_per_share })
  }
  return result
}
