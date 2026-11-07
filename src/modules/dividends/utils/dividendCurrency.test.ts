import { expect, it } from 'vitest'
import { convertDividendRow, dividendInCurrency, dividendTotals } from './dividendCurrency'
import type { DividendRow } from '../types'

const row = (overrides: Partial<DividendRow> = {}): DividendRow => ({ ticker: 'ABC', type: 'dividend', ex_date: '2026-01-01', payment_date: '2026-01-05', currency: 'USD', value_per_share: 2, quantity: 2, total_value: 4, ...overrides })
const rates = [{ date: '2026-01-02', value: 5 }, { date: '2026-02-01', value: 6 }]

it('soma USD convertido no pagamento com BRL, sem usar FX posterior', () => {
  expect(dividendTotals([row(), row({ currency: 'BRL', total_value: 7 })], ['ABC'], rates).get('ABC')).toBe(27)
  expect(dividendTotals([row(), row({ currency: 'BRL', total_value: 10, source: 'imported' })], ['ABC'], rates, new Map([['ABC', 'USD']])).get('ABC')).toBe(6)
})
it('não exibe soma parcial quando um pagamento não tem câmbio', () => {
  const rows = [row({ currency: 'BRL', total_value: 7 }), row({ payment_date: '2025-12-01' })]
  expect(dividendTotals(rows, ['ABC'], rates).get('ABC')).toBeNull()
  expect(dividendTotals([...rows].reverse(), ['ABC'], rates).get('ABC')).toBeNull()
})
it('preserva líquido, bruto, valor por ação e originais sem reconstruir pela quantidade', () => {
  const original = row({ source: 'imported', total_value: 3, gross_amount: 4, quantity: 0 })
  expect(convertDividendRow(original, 'BRL', rates)).toMatchObject({ total_value: 15, gross_amount: 20, value_per_share: 10, original_currency: 'USD', original_total_value: 3, original_gross_amount: 4, original_value_per_share: 2 })
  expect(original.total_value).toBe(3)
})
it('não depende da quantidade atual e respeita moedas originais de importações', () => {
  expect(dividendInCurrency(row({ quantity: 999 }), 'BRL', rates)).toBe(20)
  expect(dividendInCurrency(row({ source: 'imported', currency: undefined, total_value: 10 }), 'USD', rates)).toBe(2)
  expect(dividendInCurrency(row({ currency: undefined }), 'BRL', rates)).toBeNull()
})
it.each([{ fx: [] }, { fx: [{ date: '2026-01-06', value: 5 }] }, { fx: [{ date: '2025-12-01', value: 5 }] }])('recusa FX ausente, futuro ou vencido', ({ fx }) => {
  expect(dividendInCurrency(row(), 'BRL', fx)).toBeNull()
})
