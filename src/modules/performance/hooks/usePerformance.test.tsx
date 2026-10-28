import { beforeEach, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { AssetType, PositionWithAsset } from '../../portfolio/types'
import type { PerformancePeriod } from '../types'
import { usePerformance } from './usePerformance'
import { wealthService } from '../../wealth/services/wealthService'
import { dividendService } from '../../dividends/services/dividendService'
import { benchmarkService } from '../services/benchmarkService'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user' }, loading: false }) }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'w1' } }) }))
vi.mock('./useHistoricalReturns', () => ({ useHistoricalReturns: (period: string, wallet: string, type?: string) => {
  const value = type === 'stock_br' ? 1 : type === 'fii' ? 0 : 0.5
  const active = wallet === 'w1' && period === 'Tudo'
  return { monthly: active ? new Map([['2020-01', value]]) : new Map(), returnPct: active ? value : null,
    since: '2020-01-01', startDate: '2020-01-01', points: active ? [{ date: '2020-01-01', value: 100 * (1 + value), returnPct: value }, { date: '2020-01-31', value: 100 * (1 + value), returnPct: 0 }] : [], missingMonths: new Set(), incomplete: false,
    isLoading: false, isError: false, refetch: vi.fn() }
} }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: { rate: 5 }, isLoading: false }) }))
vi.mock('../../wealth/services/wealthService', () => ({ wealthService: { listPositionsSnapshot: vi.fn(), listPriceHistory: vi.fn(), listLatestPrices: vi.fn() } }))
vi.mock('../../portfolio/services/positionService', () => ({ positionService: { listPositions: async (_: string, wallet: string) => wallet === 'w2' ? [] : positions } }))
vi.mock('../../dividends/services/dividendService', () => ({ dividendService: { listDividendsByTickers: vi.fn() } }))
vi.mock('../services/benchmarkService', () => ({ benchmarkService: { listBenchmarks: vi.fn() } }))

const positions = [
  { ticker: 'AAA3', quantity: 1, average_price: 10, acquisition_date: '2020-01-01', asset: { name: 'Alfa', currency: 'BRL', type: 'stock_br' } },
  { ticker: 'FII11', quantity: 1, average_price: 10, acquisition_date: '2020-01-01', asset: { name: 'Fundo', currency: 'BRL', type: 'fii' } },
] as PositionWithAsset[]
const prices = [
  { ticker: 'AAA3', date: '2020-01-02', close: 10 }, { ticker: 'FII11', date: '2020-01-02', close: 10 },
  { ticker: 'AAA3', date: '2020-01-31', close: 20 }, { ticker: 'FII11', date: '2020-01-31', close: 10 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(wealthService.listPositionsSnapshot).mockImplementation(async (_, wallet) => wallet === 'w2' ? [] : positions.map((p) => ({ ticker: p.ticker, quantity: p.quantity, currency: 'BRL', type: p.asset!.type, acquisitionDate: p.acquisition_date })))
  vi.mocked(wealthService.listPriceHistory).mockImplementation(async (tickers, since) => prices.filter((p) => tickers.includes(p.ticker) && p.date >= since))
  vi.mocked(wealthService.listLatestPrices).mockImplementation(async (tickers) => prices.filter((p) => tickers.includes(p.ticker)))
  vi.mocked(dividendService.listDividendsByTickers).mockResolvedValue([])
  vi.mocked(benchmarkService.listBenchmarks).mockResolvedValue([])
})

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(({ type, period, wallet }: { type?: AssetType; period: PerformancePeriod; wallet: string }) => usePerformance(period, wallet, type), {
    wrapper, initialProps: { type: undefined as AssetType | undefined, period: 'Tudo' as PerformancePeriod, wallet: 'w1' },
  })
}

it('filtra gráfico, resumo, tabela e proventos juntos e restaura todas as classes sem cache cruzado', async () => {
  const { result, rerender } = show()
  await waitFor(() => expect(result.current.summary.portfolioReturnPct).toBeCloseTo(0.5))
  await waitFor(() => expect(result.current.assetRows).toHaveLength(2))
  rerender({ type: 'stock_br', period: 'Tudo', wallet: 'w1' })
  await waitFor(() => expect(result.current.summary.portfolioReturnPct).toBeCloseTo(1))
  await waitFor(() => expect(result.current.assetRows.map((r) => r.ticker)).toEqual(['AAA3']))
  expect(result.current.portfolioSeries.points[result.current.portfolioSeries.points.length - 1]?.normalized).toBe(200)
  expect(dividendService.listDividendsByTickers).toHaveBeenCalledWith(['AAA3'], '2020-01-01', true)
  rerender({ type: 'fii', period: 'Tudo', wallet: 'w1' })
  await waitFor(() => expect(result.current.summary.portfolioReturnPct).toBe(0))
  expect(result.current.assetRows.map((r) => r.ticker)).toEqual(['FII11'])
  rerender({ type: undefined, period: 'Tudo', wallet: 'w1' })
  await waitFor(() => expect(result.current.summary.portfolioReturnPct).toBeCloseTo(0.5))
})

it('Tudo alcança aquisições antigas, enquanto 1A usa sua janela; carteira vazia não reaproveita série anterior', async () => {
  const { result, rerender } = show()
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(wealthService.listPriceHistory).toHaveBeenCalledWith(['AAA3', 'FII11'], '2020-01-01')
  expect(benchmarkService.listBenchmarks).toHaveBeenCalledWith('2019-12-01')
  rerender({ type: undefined, period: '1A', wallet: 'w1' })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.hasHistory).toBe(false)
  rerender({ type: undefined, period: 'Tudo', wallet: 'w2' })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.hasPositions).toBe(false)
  expect(result.current.assetRows).toEqual([])
  expect(result.current.portfolioSeries.points).toEqual([])
})
