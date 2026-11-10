import { afterEach, expect, it, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { DividendRow } from '../types'
import { useBrlDividends } from './useBrlDividends'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'

const mocks = vi.hoisted(() => ({ rows: [] as DividendRow[], usd: vi.fn() }))
vi.mock('./useDividends', () => ({ useDividends: () => ({ rows: mocks.rows, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../../dashboard/services/historicalRatesService', () => ({ historicalRatesService: { usd: mocks.usd } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{children}</QueryClientProvider>
}
const payment = (currency = 'USD'): DividendRow => ({ ticker: 'ABC', type: 'dividend', ex_date: '2026-01-01', payment_date: '2026-01-05', currency, value_per_share: 2, quantity: 2, total_value: 4 })

it('carrega o câmbio do pagamento e reconcilia total BRL com YOC em USD', async () => {
  mocks.rows = [payment(), { ...payment('BRL'), total_value: 10, source: 'imported' }]
  mocks.usd.mockResolvedValue([{ date: '2026-01-02', value: 5 }])
  const { result } = renderHook(() => ({ brl: useBrlDividends('1A'), local: useDividendTotals(['ABC'], new Map([['ABC', 99]]), new Map([['ABC', 'USD']])) }), { wrapper })
  await waitFor(() => expect(result.current.brl.isLoading).toBe(false))
  expect(result.current.brl.rows.reduce((sum, row) => sum + row.total_value, 0)).toBe(30)
  expect(result.current.local.get('ABC')).toBe(6)
  expect(mocks.usd).toHaveBeenCalledWith('2025-12-26', '2026-01-05')
})
it('não pede câmbio para recebimentos somente BRL, nem ao recarregar', async () => {
  mocks.rows = [payment('BRL')]
  const { result } = renderHook(() => useBrlDividends('1A'), { wrapper })
  expect(result.current.rows[0].total_value).toBe(4)
  expect(result.current.isError).toBe(false)
  await result.current.refetch()
  expect(mocks.usd).not.toHaveBeenCalled()
})
it('informa indisponibilidade em vez de misturar ou omitir um pagamento sem FX', async () => {
  mocks.rows = [payment(), payment('BRL')]
  mocks.usd.mockResolvedValue([])
  const { result } = renderHook(() => useBrlDividends('1A'), { wrapper })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.isError).toBe(true)
  expect(result.current.rows).toEqual([])
})
