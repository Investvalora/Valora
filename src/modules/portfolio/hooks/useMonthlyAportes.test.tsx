import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Transaction } from '../services/transactionsService'
import { useMonthlyAportes } from './useMonthlyAportes'

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), usd: vi.fn() }))
vi.mock('../services/positionService', () => ({ positionService: { listTransactionAssets: mocks.catalog } }))
vi.mock('../../dashboard/services/historicalRatesService', () => ({ historicalRatesService: { usd: mocks.usd } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const trade = { ticker: 'AAPL', type: 'buy', quantity: 2, price: 10, transaction_date: '2026-10-04' } as Transaction
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
let client: QueryClient
function setup() { client = new QueryClient({ defaultOptions: { queries: { retry: false } } }) }

it('consulta a moeda do histórico mesmo sem posição atual e aguarda a PTAX', async () => {
  setup()
  mocks.catalog.mockResolvedValue([{ ticker: 'AAPL', type: 'stock_us', currency: 'USD' }])
  let resolve!: (rates: { date: string; value: number }[]) => void
  mocks.usd.mockReturnValue(new Promise(r => { resolve = r }))
  const { result } = renderHook(() => useMonthlyAportes([trade], 'all'), { wrapper })
  await waitFor(() => expect(mocks.usd).toHaveBeenCalledWith('2026-09-24', '2026-10-04'))
  expect(result.current.loading).toBe(true)
  expect(result.current.data).toEqual([])
  resolve([{ date: '2026-10-02', value: 5 }])
  await waitFor(() => expect(result.current.data[0]?.compras).toBe(100))
  expect(mocks.catalog).toHaveBeenCalledWith(['AAPL'])
})
it('não apresenta USD como BRL quando o serviço de câmbio falha', async () => {
  setup()
  mocks.catalog.mockResolvedValue([{ ticker: 'AAPL', type: 'stock_us', currency: 'USD' }])
  mocks.usd.mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useMonthlyAportes([trade], 'all'), { wrapper })
  await waitFor(() => expect(result.current.error).toBe(true))
  expect(result.current.data).toEqual([])
})
it('dispensa câmbio para BRL', async () => {
  setup()
  mocks.catalog.mockResolvedValue([{ ticker: 'AAPL', type: 'stock_br', currency: 'BRL' }])
  const { result } = renderHook(() => useMonthlyAportes([trade], 'all'), { wrapper })
  await waitFor(() => expect(result.current.data[0]?.compras).toBe(20))
  expect(mocks.usd).not.toHaveBeenCalled()
})
it('mantém mês indisponível quando o ativo não é encontrado no catálogo', async () => {
  setup()
  mocks.catalog.mockResolvedValue([])
  const { result } = renderHook(() => useMonthlyAportes([trade], 'all'), { wrapper })
  await waitFor(() => expect(result.current.data[0]?.incomplete).toBe(1))
  expect(result.current.data[0].compras).toBeNull()
  expect(mocks.usd).not.toHaveBeenCalled()
})
