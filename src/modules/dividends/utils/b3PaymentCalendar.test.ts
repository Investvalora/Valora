import { expect, it } from 'vitest'
import { b3PaymentCalendar } from './b3PaymentCalendar'
import type { DividendRaw } from '../types'

const anchor: DividendRaw = { ticker: 'KLBN4', type: 'dividend', ex_date: '2025-12-16', payment_date: null, value_per_share: 0.180583 }
const payments = ['2026-02-27', '2026-05-20', '2026-08-19', '2026-11-12'].map(payment_date => ({ ticker: 'KLBN4', type: 'dividend', record_date: '2025-12-15', payment_date, value_per_share: 0.04559717224 }))
it('mostra a parcela de novembro pelo valor oficial sem somar o anúncio agregado do Yahoo', () => {
  const rows = b3PaymentCalendar([anchor], [anchor], payments, 'announced', '2026-01-01', '2026-11-11')
  expect(rows).toEqual([{ ...anchor, record_date: '2025-12-15', payment_date: '2026-11-12', value_per_share: 0.04559717224, is_installment: true }])
  expect(rows[0].value_per_share * 116).toBeCloseTo(5.28927197984)
})
it('na data de pagamento transfere a mesma parcela para pagos, preservando o período', () => {
  expect(b3PaymentCalendar([], [anchor], payments, 'paid', '2026-11-01', '2026-11-12')).toHaveLength(1)
  expect(b3PaymentCalendar([anchor], [anchor], payments, 'announced', '2026-11-01', '2026-11-12')).toEqual([])
})
it('mantém anúncio sem data quando não existe uma data ex inequívoca; não inventa calendário', () => {
  expect(b3PaymentCalendar([anchor], [], payments, 'announced', '2026-01-01', '2026-11-11')).toEqual([anchor])
  expect(b3PaymentCalendar([anchor], [anchor, { ...anchor, ex_date: '2025-12-17' }], payments, 'announced', '2026-01-01', '2026-11-11')).toEqual([anchor])
})
