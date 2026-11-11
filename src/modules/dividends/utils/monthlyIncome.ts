import type { MonthlyBar } from '../types'

export interface MonthlyIncome { month: string; received: number; receivable: number; total: number }

/** Inputs have disjoint paid/future payment dates. Never modifies paid KPIs. */
export function monthlyIncome(paid: MonthlyBar[], announced: MonthlyBar[]): MonthlyIncome[] {
  const months = new Map<string, MonthlyIncome>()
  for (const [rows, field] of [[paid, 'received'], [announced, 'receivable']] as const) {
    for (const row of rows) {
      const month = months.get(row.month) ?? { month: row.month, received: 0, receivable: 0, total: 0 }
      month[field] += row.total
      month.total += row.total
      months.set(row.month, month)
    }
  }
  // Round only the displayed monthly subtotals, after aggregation. The total
  // must equal the two visible amounts; original receipts and KPIs stay intact.
  return [...months.values()].map(row => {
    const receivedCents = Math.round((row.received + Number.EPSILON) * 100)
    const receivableCents = Math.round((row.receivable + Number.EPSILON) * 100)
    return { ...row, received: receivedCents / 100, receivable: receivableCents / 100, total: (receivedCents + receivableCents) / 100 }
  }).sort((a, b) => a.month.localeCompare(b.month))
}
