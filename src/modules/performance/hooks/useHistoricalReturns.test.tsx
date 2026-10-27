import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { useHistoricalReturns } from './useHistoricalReturns'

const inputs = vi.hoisted(() => ({ missing: false }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test' } }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: (wallet: string) => ({
  data: wallet === 'empty' ? [] : [{ wallet_id: wallet, ticker: 'AAA', quantity: 2, average_price: 100, acquisition_date: '2026-01-02', asset: { currency: 'BRL', type: 'stock_br' } }],
  isSuccess: true, dataUpdatedAt: 1, refetch: vi.fn(),
}) }))
vi.mock('../../portfolio/hooks/useTransactions', () => ({ useAllTransactions: (wallet: string) => ({
  data: wallet === 'empty' ? [] : [
    { wallet_id: wallet, ticker: 'AAA', type: 'buy', quantity: 1, price: 100, transaction_date: '2026-01-02', seq: 1 },
    { wallet_id: wallet, ticker: 'AAA', type: 'buy', quantity: 1, price: 100, transaction_date: '2026-01-03', seq: 2 },
  ], isSuccess: true, dataUpdatedAt: 1, refetch: vi.fn(),
}) }))
vi.mock('../../portfolio/hooks/useFixedIncomeHistory', () => ({ useFixedIncomeHistory: () => ({ data: { positions: [], events: [] }, isSuccess: true, dataUpdatedAt: 1, refetch: vi.fn() }) }))
vi.mock('../../dividends/hooks/useDividends', () => ({ useDividends: () => ({ rows: [], refetch: vi.fn() }) }))
vi.mock('../../portfolio/services/positionService', () => ({ positionService: { findAssetByTicker: async () => ({ ticker: 'AAA', currency: 'BRL', type: 'stock_br' }) } }))
vi.mock('../../wealth/services/wealthService', () => ({ wealthService: { listPriceHistory: async () => {
  const prices = []
  for (let date = '2026-01-02'; date <= new Date().toISOString().slice(0, 10); date = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10)) {
    if (!inputs.missing || date >= '2026-01-10') prices.push({ ticker: 'AAA', date, close: date < '2026-01-04' ? 100 : 110 })
  }
  return prices
} } }))

it('integra movimentos, evita aporte como retorno e troca classe/carteira sem reaproveitar resultado anterior', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, rerender } = renderHook(({ wallet, type }: { wallet: string; type?: 'fii' }) => useHistoricalReturns('Tudo', wallet, type), { wrapper, initialProps: { wallet: 'w', type: undefined as 'fii' | undefined } })
  await waitFor(() => expect(result.current.returnPct).toBeCloseTo(0.1))
  expect(result.current.incomplete).toBe(false)
  expect(result.current.monthly.get('2026-01')).toBeCloseTo(0.1)
  rerender({ wallet: 'w', type: 'fii' })
  await waitFor(() => expect(result.current.returnPct).toBeNull())
  rerender({ wallet: 'empty', type: undefined })
  await waitFor(() => expect(result.current.points).toEqual([]))
  expect(result.current.returnPct).toBeNull()
})

it('não publica retorno ao terminar de carregar um histórico com início sem preço', async () => {
  inputs.missing = true
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useHistoricalReturns('Tudo', 'w'), { wrapper })
  await waitFor(() => expect(result.current.incomplete).toBe(true))
  expect(result.current.returnPct).toBeNull()
  expect(result.current.monthly.has('2026-01')).toBe(false)
  inputs.missing = false
})
