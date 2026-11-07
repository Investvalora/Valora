import { rateAt, type DatedRate } from '../../dashboard/historicalValuation'
import type { DividendRow } from '../types'

/** Preserve net/gross and per-share bases independently. Never reconstruct gross from net. */
export function convertDividendRow(row: DividendRow, target: string, rates: DatedRate[]): DividendRow | null {
  const total = dividendInCurrency(row, target, rates)
  const perShare = dividendInCurrency({ ...row, total_value: row.value_per_share }, target, rates)
  const gross = row.gross_amount === undefined ? undefined
    : dividendInCurrency({ ...row, total_value: row.gross_amount }, target, rates)
  if (total === null || perShare === null || gross === null) return null
  return { ...row, original_currency: row.currency ?? (row.source === 'imported' ? 'BRL' : undefined),
    original_total_value: row.total_value, original_value_per_share: row.value_per_share,
    original_gross_amount: row.gross_amount,
    total_value: total, value_per_share: perShare, gross_amount: gross, currency: target }
}

/** Converts only at payment date, using a recent previous publication, never future/current FX. */
export function dividendInCurrency(row: DividendRow, target: string, rates: DatedRate[]): number | null {
  const amount = Number(row.total_value)
  const currency = row.currency ?? (row.source === 'imported' ? 'BRL' : null)
  if (!Number.isFinite(amount) || !currency || !['BRL', 'USD'].includes(target)) return null
  if (currency === target) return amount
  if (!['BRL', 'USD'].includes(currency) || !row.payment_date) return null
  const fx = rateAt(rates, row.payment_date)
  return fx === null ? null : target === 'BRL' ? amount * fx : amount / fx
}

export function dividendTotals(rows: DividendRow[], tickers: string[], rates: DatedRate[], targets?: Map<string, string>) {
  const totals = new Map<string, number | null>()
  const wanted = new Set(tickers)
  for (const row of rows) {
    if (!wanted.has(row.ticker)) continue
    const amount = dividendInCurrency(row, targets?.get(row.ticker) ?? 'BRL', rates)
    const previous = totals.get(row.ticker)
    totals.set(row.ticker, amount === null || previous === null ? null : (previous ?? 0) + amount)
  }
  return totals
}
