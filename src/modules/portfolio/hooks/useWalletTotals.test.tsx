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
import { useAtivosValuation } from '../../ativos/hooks/useAtivosValuation'
import { useAssetFilters } from '../../ativos/hooks/useAssetFilters'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user' }, loading: false }) }))
vi.mock('../../performance/hooks/useHistoricalReturns', () => ({ useHistoricalReturns: (period: string) => ({
  returnPct: period === '1A' ? 0.1 : 0.21, incomplete: false, isLoading: false, isError: false, refetch: vi.fn(),
}) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: vi.fn() }))
vi.mock('../services/positionService', () => ({
  normalizeTickers: (tickers: string[]) => [...new Set(tickers)].sort(),
  positionService: { listAllPositions: vi.fn(), listPositions: vi.fn(), listLatestQuotes: vi.fn() },
}))
vi.mock('../services/fixedIncomeService', () => ({ fixedIncomeService: { listPositions: vi.fn(), listHistory: vi.fn() } }))
vi.mock('../services/transactionsService', () => ({ transactionsService: { listAll: async () => [] } }))
vi.mock('../../dashboard/services/historicalRatesService', () => ({ historicalRatesService: { usd: async () => [], macro: async () => [] } }))
vi.mock('../../dividends/services/dividendService', () => ({ dividendService: { listDividendsByTickers: async () => [] } }))
vi.mock('../../wealth/hooks/useWealthHistory', () => ({ useWealthHistory: (period: string) => ({
  positions: [{ ticker: 'BR', quantity: 1, currency: 'BRL', type: 'stock_br' }],
  lastPricesMap: new Map([['BR', 11575.73]]), usdRate: 5,
  series: period === '1A' ? annualHistory ?? history : history, latestDate: null, earliestDate: null, isLoading: false, isError: false, refetch: vi.fn(),
  priceRows: history.map((point) => ({ ticker: 'BR', date: point.date, close: point.value })),
}) }))

const positions = [
  { id: 'br', wallet_id: 'w1', ticker: 'BR', quantity: 1, average_price: 10000, acquisition_date: '2000-01-01', asset: { currency: 'BRL', type: 'stock_br' } },
  { id: 'usd', wallet_id: 'w2', ticker: 'USD', quantity: 2, average_price: 10, asset: { currency: 'USD', type: null } },
] as PositionWithAsset[]
const fixed = [{ wallet_id: 'w1', principal: 900, current_value: 1000, application_date: '2000-01-01' }] as FixedIncomePosition[]
let close = 11524.60
let history: Array<{ date: string; value: number | null }> = []
let annualHistory: typeof history | undefined

beforeEach(() => {
  vi.clearAllMocks()
  useAssetFilters.getState().clear()
  close = 11524.60
  history = []
  annualHistory = undefined
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
  return { ...renderHook(() => ({ selector: useWalletTotals(), dashboard: useDashboard('w1', filters), assets: useAtivosValuation('w1') }), { wrapper }), client }
}

it('concilia Início e Ativos para carteira mista após compra, resgate parcial e nova cotação', async () => {
  const { result, client } = show()
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(12524.60))
  expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(result.current.assets.patrimonioBRL!)

  // Representa os dados retornados depois de uma nova compra e de um resgate.
  const purchased = { ...positions[0], quantity: 2 }
  const redeemed = { ...fixed[0], principal: 450, remaining_principal: 450, current_value: 500 }
  vi.mocked(positionService.listAllPositions).mockResolvedValue([purchased, positions[1]])
  vi.mocked(positionService.listPositions).mockResolvedValue([purchased])
  vi.mocked(fixedIncomeService.listPositions).mockResolvedValue([redeemed])
  close = 11575.73
  await act(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['portfolio', 'positions', 'user'] }),
      client.invalidateQueries({ queryKey: ['portfolio', 'fixed-income', 'user'] }),
      client.invalidateQueries({ queryKey: ['portfolio', 'quotes'] }),
    ])
  })
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(23651.46))
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(23651.46))
  expect(result.current.selector.totals.get('w2')).toBe(100)
})

it('distingue subtotal filtrado em Ativos do patrimônio completo e volta a conciliar ao limpar', async () => {
  const { result } = show()
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(12524.60))
  act(() => useAssetFilters.getState().apply({ query: '', types: ['stock_br'] }))
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(11524.60))
  expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12524.60)
  act(() => useAssetFilters.getState().clear())
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(result.current.dashboard.totalPatrimonioBRL!))
})

it('não transforma ausência de cotação em patrimônio parcial em nenhuma das duas telas', async () => {
  vi.mocked(positionService.listLatestQuotes).mockResolvedValue([])
  const { result } = show()
  await waitFor(() => expect(result.current.assets.isLoading).toBe(false))
  await waitFor(() => expect(result.current.selector.isLoading).toBe(false))
  expect(result.current.assets.patrimonioBRL).toBeNull()
  expect(result.current.dashboard.totalPatrimonioBRL).toBeNull()
})

it('concilia a composição persistida da massa do relatório com as cotações de 30/10', async () => {
  // Snapshot de conferência; não é reconstrução das cotações da captura de 29/10.
  const reportedPositions = [
    { ...positions[0], id: 'petr', ticker: 'PETR4', quantity: 10, average_price: 50 },
    { ...positions[0], id: 'klbn', ticker: 'KLBN4', quantity: 31, average_price: 3 },
  ]
  const reportedFixed = [{ ...fixed[0], principal: 1600, current_value: 1600 }]
  vi.mocked(positionService.listAllPositions).mockResolvedValue(reportedPositions)
  vi.mocked(positionService.listPositions).mockResolvedValue(reportedPositions)
  vi.mocked(fixedIncomeService.listPositions).mockResolvedValue(reportedFixed)
  vi.mocked(positionService.listLatestQuotes).mockResolvedValue([
    { ticker: 'PETR4', close: 53.20, date: '2026-10-30' },
    { ticker: 'KLBN4', close: 3.38, date: '2026-10-30' },
  ] as Awaited<ReturnType<typeof positionService.listLatestQuotes>>)
  const { result } = show()
  await waitFor(() => expect(result.current.assets.patrimonioBRL).toBeCloseTo(2236.78))
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(2236.78))
})

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

it('usa retorno histórico equivalente a Desempenho e mantém 12M separado do total e do custo atual', async () => {
  history = [{ date: '2025-01-31', value: 100 }, { date: '2026-08-31', value: 110 }, { date: '2026-09-30', value: 121 }]
  annualHistory = history.slice(1)
  const { result } = show()
  await waitFor(() => expect(result.current.dashboard.totalPatrimonioBRL).toBeCloseTo(12524.60))
  expect(result.current.dashboard.rentabilidadeTotalPct).toBeCloseTo(21)
  expect(result.current.dashboard.variacaoPct).toBeCloseTo(10)
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
