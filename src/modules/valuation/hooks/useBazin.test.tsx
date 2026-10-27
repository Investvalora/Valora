import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useBazin } from './useBazin'

const fetchHistory = vi.hoisted(() => vi.fn())
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }))
vi.mock('../services/insightService', () => ({ insightService: { fetchYahooDividends: fetchHistory } }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: { rate: 5, isFallback: false }, isLoading: false, refetch: vi.fn() }) }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => { fetchHistory.mockReset() })

it('busca o histórico de mercado uma vez por ticker e calcula com os eventos retornados', async () => {
  fetchHistory.mockResolvedValue({ ticker: 'MXRF11', source: 'yahoo', annualDividend: 0.18, payments: [{ date: new Date().toISOString().slice(0, 10), amount: 1.2 }] })
  const { result } = renderHook(() => useBazin(['MXRF11', 'MXRF11'], 0.06, new Map([['MXRF11', 'BRL']])), { wrapper })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(fetchHistory).toHaveBeenCalledTimes(1)
  expect(fetchHistory).toHaveBeenCalledWith('MXRF11', 'BRL')
  expect(result.current.bazinByTicker.get('MXRF11')?.ceilingPriceLocal).toBeCloseTo(20)
})

it('mantém o teto indisponível quando a fonte falha, sem recorrer a registros parciais', async () => {
  fetchHistory.mockRejectedValue(new Error('Fonte indisponível'))
  const { result } = renderHook(() => useBazin(['MXRF11'], 0.06, new Map([['MXRF11', 'BRL']])), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.bazinByTicker.get('MXRF11')?.ceilingPriceLocal).toBeNull()
})
