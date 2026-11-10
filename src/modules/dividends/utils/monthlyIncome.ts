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
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
}
