import { describe, expect, it } from 'vitest'
import { mergeIncomeHistory, type IncomeHistory, type RecordedIncome } from './incomeHistoryService'
import type { DividendRow } from '../types'

const entry: RecordedIncome = {
  id: 'paid-1', ticker: 'SOLD', type: 'jcp', record_date: '2025-12-30',
  payment_date: '2026-01-15', quantity: 0.01, value_per_share: 1,
  gross_amount: 2, net_amount: 1.7, currency: 'BRL', asset: { type: 'stock_us' },
}
const history: IncomeHistory = { entries: [entry], coverage: [{ covered_from: '2024-01-01', covered_until: '2026-10-26' }] }
const estimate: DividendRow = { ticker: 'SOLD', type: 'dividend', ex_date: '2026-01-01', payment_date: '2026-01-15', quantity: 100, value_per_share: 1, total_value: 100 }

describe('private received income', () => {
  it('replaces estimates for the complete covered period and keeps actual net totals of closed positions', () => {
    const rows = mergeIncomeHistory([estimate, { ...estimate, ticker: 'OTHER' }], history, '2024-01-01', '2026-10-26')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ ticker: 'SOLD', total_value: 1.7, gross_amount: 2, currency: 'BRL', record_date: '2025-12-30' })
  })
  it('keeps separate payments on the same date and never recomputes rounded amounts', () => {
    const rows = mergeIncomeHistory([], { ...history, entries: [entry, { ...entry, id: 'paid-2', net_amount: 0.13 }] }, '2024-01-01', '2026-10-26')
    expect(rows.map(row => row.total_value)).toEqual([1.7, 0.13])
  })
  it('filters by payment period and does not include future entries', () => {
    expect(mergeIncomeHistory([], { ...history, entries: [entry, { ...entry, payment_date: '2026-12-01' }] }, '2026-02-01', '2026-10-26')).toEqual([])
  })
  it('keeps automatic estimates outside imported coverage and wallets without imports', () => {
    expect(mergeIncomeHistory([estimate], { entries: [], coverage: [] }, '2024-01-01')).toEqual([estimate])
    const later = { ...estimate, payment_date: '2026-11-15' }
    expect(mergeIncomeHistory([later], history, '2024-01-01', '2026-12-01')).toContainEqual(later)
  })
})
