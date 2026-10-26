import { beforeEach, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PositionWithAsset, FixedIncomePosition } from '../types'
import { positionService } from '../services/positionService'
import { fixedIncomeService } from '../services/fixedIncomeService'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { useWalletTotals } from './useWalletTotals'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import type { WealthChartFilters } from '../../dashboard/hooks/useDashboard'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user' }, loading: false }) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: vi.fn() }))
vi.mock('../services/positionService', () => ({
  normalizeTickers: (tickers: string[]) => [...new Set(tickers)].sort(),
  positionService: { listAllPositions: vi.fn(), listPositions: vi.fn(), listLatestQuotes: vi.fn() },
}))
vi.mock('../services/fixedIncomeService', () => ({ fixedIncomeService: { listPositions: vi.fn(), listHistory: vi.fn() } }))
vi.mock('../services/transactionsService', () => ({ transactionsService: { listAll: async () => [] } }))
vi.mock('../../dashboard/services/historicalRatesService', () => ({ historicalRatesService: { usd: async () => [], macro: async () => [] } }))
vi.mock('../../dividends/services/dividendService', () => ({ dividendService: { listDividendsByTickers: async () => [] } }))
vi.mock('../../wealth/hooks/useWealthHistory', () => ({ useWealthHistory: () => ({
  positions: [{ ticker: 'BR', quantity: 1, currency: 'BRL', type: 'stock_br' }],
  lastPricesMap: new Map([['BR', 11575.73]]), usdRate: 5,
  series: history, latestDate: null, earliestDate: null, isLoading: false, isError: false, refetch: vi.fn(),
  priceRows: history.map((point) => ({ ticker: 'BR', date: point.date, close: point.value })),
}) }))

const positions = [
  { id: 'br', wallet_id: 'w1', ticker: 'BR', quantity: 1, average_price: 10000, acquisition_date: '2000-01-01', asset: { currency: 'BRL', type: 'stock_br' } },
  { id: 'usd', wallet_id: 'w2', ticker: 'USD', quantity: 2, average_price: 10, asset: { currency: 'USD', type: null } },
] as PositionWithAsset[]
const fixed = [{ wallet_id: 'w1', principal: 900, current_value: 1000, application_date: '2000-01-01' }] as FixedIncomePosition[]
let close = 11524.60
let history: Array<{ date: string; value: number | null }> = []

beforeEach(() => {
  vi.clearAllMocks()
  close = 11524.60
  history = []
  vi.mocked(useUSDRate).mockReturnValue({ data: { rate: 5 }, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useUSDRate>)
  vi.mocked(positionService.listAllPositions).mockResolvedValue(positions)
  vi.mocked(positionService.listPositions).mockResolvedValue([positions[0]])
  vi.mocked(positionService.listLatestQuotes).mockImplementation(async () => [
    { ticker: 'BR', close, date: '2026-10-23' }, { ticker: 'USD', close: 10, date: '2026-10-23' },
  ] as Awaited<ReturnType<typeof positionService.listLatestQuotes>>)
  vi.mocked(fixedIncomeService.listPositions).mockResolvedValue(fixed)
  vi.mocked(fixedIncomeService.listHistory).mockResolvedValue({ positions: fixed.map((position) => ({ ...position, indexer: 'pre', rate: 0, active: true })), events: [] })
})

function show(filters?: WealthChartFilters) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => ({ selector: useWalletTotals(), dashboard: useDashboard('w1', filters) }), { wrapper }), client }
}

it('mantém resumo e seletor iguais mesmo com cache histórico antigo e isola carteiras', async () => {
  const { result, client } = show()
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12524.60))
  expect(result.current.selector.totals.get('w1')).toBe(result.current.dashboard.totalPatrimonioBRL)
  expect(result.current.selector.totals.get('w2')).toBe(100)
  close = 11575.73
  await act(async () => { await client.invalidateQueries({ queryKey: ['portfolio', 'quotes'] }) })
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12575.73))
  expect(result.current.selector.totals.get('w1')).toBe(result.current.dashboard.totalPatrimonioBRL)
})

it('não usa câmbio fixo inventado para carteira em USD sem taxa', async () => {
  vi.mocked(useUSDRate).mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<typeof useUSDRate>)
  const { result } = show()
  await waitFor(() => expect(result.current.selector.totals.has('w2')).toBe(true))
  expect(result.current.selector.totals.get('w2')).toBeNull()
  expect(result.current.selector.totals.get('w1')).toBeCloseTo(12524.60)
})

it('mantém o ganho no topo da barra atual mesmo com histórico parcial e preserva meses fechados', async () => {
  const month = new Date().toISOString().slice(0, 7)
  history = [{ date: '2000-01-31', value: 11000 }, { date: `${month}-01`, value: 10500 }]
  const { result, client } = show()
  await waitFor(() => expect(result.current.dashboard.valorInvestidoBRL).toBe(10900))
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12524.60))
  const point = result.current.dashboard.monthlySeries.find((point) => point.month === month)!
  expect(point.totalBRL).toBeCloseTo(12524.60)
  expect(point.investedBRL).toBe(10900)
  expect(point.totalBRL! - point.investedBRL!).toBeCloseTo(1624.60)
  await waitFor(() => expect(result.current.dashboard.monthlySeries.find((point) => point.month === '2000-01')?.totalBRL).toBe(11900))

  close = 11575.73
  await act(async () => { await client.invalidateQueries({ queryKey: ['portfolio', 'quotes'] }) })
  await waitFor(() => expect(result.current.dashboard.monthlySeries.find((point) => point.month === month)?.totalBRL).toBeCloseTo(12575.73))
})

it('não apresenta patrimônio parcial como completo quando falta cotação', async () => {
  vi.mocked(positionService.listLatestQuotes).mockResolvedValue([])
  const { result } = show()
  await waitFor(() => expect(result.current.selector.isLoading).toBe(false))
  expect(result.current.selector.totals.get('w1')).toBeNull()
  expect(result.current.dashboard.totalPatrimonioBRL).toBeNull()
})

it('filtra a barra atual por tipo sem incluir renda fixa e sem alterar o KPI da carteira', async () => {
  const { result } = show({ type: 'stock_br' })
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12524.60))
  await waitFor(() => expect(result.current.dashboard.monthlySeries[0]?.totalBRL).toBeCloseTo(11524.60))
  expect(result.current.dashboard.monthlySeries[0].investedBRL).toBe(10000)
})

it('respeita a data final histórica sem inserir o patrimônio atual nem posições de outro tipo', async () => {
  history = [{ date: '2000-01-15', value: 11000 }, { date: '2000-01-31', value: 12000 }]
  const { result } = show({ type: 'stock_br', from: '2000-01-01', to: '2000-01-20' })
  await waitFor(() => expect(result.current.dashboard.isLoading).toBe(false))
  expect(result.current.dashboard.monthlySeries).toEqual([{ month: '2000-01', totalBRL: 11000, investedBRL: 10000 }])
})
