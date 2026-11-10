import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import type { DividendRow } from '../types'
import { useMonthReceivables } from './useMonthReceivables'

const mocks = vi.hoisted(() => ({ rows: [] as DividendRow[], rates: [] as { date: string; value: number }[], failed: false }))
vi.mock('./useDividends', () => ({ useDividends: () => ({ rows: mocks.rows, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('./useDividendCurrency', () => ({ useDividendCurrency: () => ({ rates: mocks.rates, isLoading: false, isError: mocks.failed, refetch: vi.fn() }) }))
afterEach(() => { cleanup(); vi.useRealTimers(); mocks.failed = false })
const row = (payment_date: string | null, currency = 'BRL'): DividendRow => ({ ticker: 'ABC', type: 'dividend', ex_date: '2026-11-01', payment_date, currency, quantity: 2, value_per_share: 1, total_value: 2 })

it('inclui apenas pagamentos futuros do mês e usa câmbio atual estimado, sem inventar data', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T15:00:00Z'))
  mocks.rows = [row('2026-11-16'), row('2026-11-25', 'USD'), row(null), row('2026-12-01'), row('2026-11-10')]
  mocks.rates = [{ date: '2026-11-09', value: 5 }]
  const { result } = renderHook(() => useMonthReceivables())
  expect(result.current.rows.map(r => [r.payment_date, r.total_value])).toEqual([['2026-11-16', 2], ['2026-11-25', 10]])
  expect(mocks.rows[1].total_value).toBe(2)
  expect(result.current.isError).toBe(false)
  expect(result.current.hasUndated).toBe(true)
})
it('não exibe previsão parcial quando falta câmbio de um anúncio', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T15:00:00Z'))
  mocks.rows = [row('2026-11-16'), row('2026-11-25', 'USD')]; mocks.rates = []
  const { result } = renderHook(() => useMonthReceivables())
  expect(result.current.isError).toBe(true)
  expect(result.current.rows).toEqual([])
})
