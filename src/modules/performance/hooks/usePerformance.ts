import { useHistoricalReturns } from './useHistoricalReturns'
import { returnChartSeries, alignedBenchmarkSeries } from '../utils/returnChartSeries'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { useWealthHistory } from '../../wealth/hooks/useWealthHistory'
import { positionService } from '../../portfolio/services/positionService'
import { dividendService } from '../../dividends/services/dividendService'
import { benchmarkService } from '../services/benchmarkService'
import { toIsoDate } from '../../../shared/utils/isoDate'
import {
  computeAssetRows,
  extractReturnPct,
  computeMonthlyTableData,
} from '../utils/performanceCalculations'
import { INTERNATIONAL_TYPES } from '../../portfolio/composition'
import type { PerformancePeriod, PerformanceSeries, PerformanceSummary, AssetReturnRow } from '../types'
import type { MonthlyTableRow } from '../utils/performanceCalculations'
import type { AssetType, PositionWithAsset } from '../../portfolio/types'
import type { DividendRaw } from '../../dividends/types'
import type { WealthPeriod } from '../../wealth/types'

/** staleTime de 5 minutos — dados de baixa frequência. */
const STALE_TIME_MS = 5 * 60 * 1000

/** Referências comparadas no mesmo calendário da carteira. */
const BENCHMARK_CONFIG = [
  { name: 'CDI',  label: 'CDI',  color: '#22c55e' },
  { name: 'IBOV', label: 'IBOV', color: '#eab308' },
  { name: 'IFIX', label: 'IFIX', color: '#f97316' },
] as const

export function performanceQueryKey(userId: string | undefined, period: PerformancePeriod) {
  return ['performance', 'return', userId, period] as const
}

export interface UsePerformanceResult {
  historyIssues?: string[]
  historyIncomplete?: boolean
  /** Série diária da carteira, base 100, com lacunas preservadas. */
  portfolioSeries: PerformanceSeries
  /** Índices nas mesmas datas e bases da carteira. */
  benchmarkSeries: PerformanceSeries[]
  /** Resumo de retornos para os cards. */
  summary: PerformanceSummary
  /** Linhas da tabela de rentabilidade por ativo. */
  assetRows: AssetReturnRow[]
  /**
   * Tabela de rentabilidade mês a mês, agrupada por ano.
   * Ordenada por ano decrescente. Usada para a grade estilo Investidor10.
   */
  monthlyTableData: MonthlyTableRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  hasPositions: boolean
  hasHistory: boolean
  usdRateIsFallback: boolean
}

/** Retorno agregado reconstruido por movimentos e cobertura historica.
 * As posicoes atuais continuam separadas para a tabela por ativo.
 */
export function usePerformance(period: PerformancePeriod, walletId?: string, assetType?: AssetType): UsePerformanceResult {
  const { user } = useAuth()
  const userId = user?.id

  // Carteira ainda carregando ('') não deve consultar o agregado de todas.
  const { selectedWallet } = useWallets()
  const effectiveWalletId = walletId ?? selectedWallet?.id ?? ''
  const historical = useHistoricalReturns(period, effectiveWalletId, assetType)

  // 1. Série de patrimônio diário + posições snapshot + USD rate
  const wealth = useWealthHistory(period as WealthPeriod, effectiveWalletId, undefined, assetType)

  // Janela já definida pelo histórico da carteira e período selecionado.
  const since = historical.since

  const positionsQuery = useQuery<PositionWithAsset[]>({
    queryKey: ['portfolio', 'positions', userId, effectiveWalletId],
    queryFn: () => positionService.listPositions(userId as string, effectiveWalletId),
    enabled: Boolean(userId) && walletId !== '',
    staleTime: STALE_TIME_MS,
  })

  const positions = useMemo(
    () => (positionsQuery.data ?? []).filter((position) => !assetType || position.asset?.type === assetType),
    [positionsQuery.data, assetType],
  )

  const tickers = useMemo(
    () => positions.map((p) => p.ticker).sort(),
    [positions],
  )

  // 3. Dividendos do período
  const dividendsQuery = useQuery<DividendRaw[]>({
    queryKey: ['performance', 'dividends', userId, effectiveWalletId, period, since, assetType, tickers],
    queryFn: () =>
      tickers.length > 0
        ? dividendService.listDividendsByTickers(tickers, since, true)
        : Promise.resolve([]),
    enabled: Boolean(userId) && !wealth.isLoading,
    staleTime: STALE_TIME_MS,
  })

  const dividendRows = useMemo(() => {
    const raw = dividendsQuery.data ?? []
    const qtyMap = new Map<string, number>()
    for (const p of positions) qtyMap.set(p.ticker, p.quantity)
    return raw
      .filter((r) => {
        const qty = qtyMap.get(r.ticker)
        return qty !== undefined && qty > 0
      })
      .map((r) => {
        const qty = qtyMap.get(r.ticker)!
        return { ...r, quantity: qty, total_value: r.value_per_share * qty }
      })
  }, [dividendsQuery.data, positions])

  // 4. Benchmarks — busca desde o mês de `since` para ter o mês anterior
  //    como base do primeiro retorno mensal
  const benchmarkSince = useMemo(() => {
    // Vai um mês antes do início para poder calcular o retorno do primeiro mês
    const [year, month] = since.split('-').map(Number)
    const prevMonth = month === 1
      ? `${year - 1}-12-01`
      : `${year}-${String(month - 1).padStart(2, '0')}-01`
    return prevMonth
  }, [since])

  const benchmarksQuery = useQuery({
    queryKey: ['benchmarks', period, benchmarkSince],
    queryFn: () => benchmarkService.listBenchmarks(benchmarkSince),
    enabled: Boolean(userId) && !wealth.isLoading && !historical.isLoading,
    staleTime: STALE_TIME_MS,
  })

  // 5. USD rate
  const hasInternational = useMemo(
    () =>
      wealth.positions.some(
        (p) =>
          p.currency === 'USD' &&
          p.type !== null &&
          (INTERNATIONAL_TYPES as readonly string[]).includes(p.type),
      ),
    [wealth.positions],
  )
  const usdRateQuery = useUSDRate({ enabled: hasInternational })

  const portfolioMonthlyReturns = historical.monthly
  const portfolioSeries = useMemo<PerformanceSeries>(() => {
    if (historical.isLoading || historical.isError) return { label: 'Carteira', color: '#3b82f6', points: [] }
    const month = toIsoDate(new Date()).slice(0, 7)
    const selected = historical.points.filter(p => p.date >= historical.since)
    const closed = selected.filter(p => p.date.slice(0, 7) < month)
    return returnChartSeries(closed.length ? closed : selected, historical.since)
  }, [historical.isLoading, historical.isError, historical.points, historical.since])
  const portfolioReturnPct = historical.returnPct

  const benchmarkSeries = useMemo<PerformanceSeries[]>(() => BENCHMARK_CONFIG.map(({ name, label, color }) =>
    alignedBenchmarkSeries(portfolioSeries, (benchmarksQuery.data ?? []).filter(r => r.name === name), label, color)
  ), [benchmarksQuery.data, portfolioSeries])

  // Resumo para os cards
  const summary = useMemo<PerformanceSummary>(() => {
    const [cdiSeries, ibovSeries, ifixSeries] = benchmarkSeries

    // Após lacuna, a linha é um trecho local; não publicar seu valor como total.
    const toReturn = (s: PerformanceSeries): number | null => historical.incomplete ? null : extractReturnPct(s)

    const cdiReturnPct  = cdiSeries  ? toReturn(cdiSeries)  : null
    const ibovReturnPct = ibovSeries ? toReturn(ibovSeries) : null
    const ifixReturnPct = ifixSeries ? toReturn(ifixSeries) : null

    const vscdipPp =
      portfolioReturnPct !== null && cdiReturnPct !== null
        ? (portfolioReturnPct - cdiReturnPct) * 100
        : null

    return { portfolioReturnPct, cdiReturnPct, ibovReturnPct, ifixReturnPct, vscdipPp }
  }, [portfolioReturnPct, benchmarkSeries, historical.incomplete])

  // Tabela de rentabilidade por ativo
  const assetRows = useMemo<AssetReturnRow[]>(() => {
    const firstPoint = wealth.series.find((p) => p.value !== null && Number.isFinite(p.value))
    const lastPoint = wealth.series.length > 0 ? wealth.series[wealth.series.length - 1] : null

    if (firstPoint && lastPoint) {
      return computeAssetRows(
        positions,
        wealth.lastPricesMap,
        dividendRows,
        firstPoint.date,
        lastPoint.date,
      )
    }
    return computeAssetRows(positions, wealth.lastPricesMap, dividendRows)
  }, [positions, wealth.lastPricesMap, dividendRows, wealth.series])

  // Tabela mês a mês (estilo Investidor10)
  const monthlyTableData = useMemo<MonthlyTableRow[]>(
    () => computeMonthlyTableData(portfolioMonthlyReturns).map(row => ({ ...row,
      annualReturn: [...historical.missingMonths].some(m => Number(m.slice(0, 4)) === row.year) ? null : row.annualReturn,
      accumulatedReturn: [...historical.missingMonths].some(m => Number(m.slice(0, 4)) <= row.year) ? null : row.accumulatedReturn,
    })),
    [portfolioMonthlyReturns, historical.missingMonths],
  )

  const isLoading = historical.isLoading ||
    wealth.isLoading ||
    positionsQuery.isLoading ||
    dividendsQuery.isLoading ||
    benchmarksQuery.isLoading

  const isError = historical.isError ||
    wealth.isError ||
    positionsQuery.isError ||
    dividendsQuery.isError ||
    benchmarksQuery.isError

  const error = (
    (positionsQuery.error ?? benchmarksQuery.error ?? dividendsQuery.error) as Error | null
  )

  const refetch = () => {
    historical.refetch()
    void wealth.refetch()
    void positionsQuery.refetch()
    void benchmarksQuery.refetch()
    void dividendsQuery.refetch()
  }

  return {
    historyIssues: historical.issues,
    historyIncomplete: historical.incomplete,
    portfolioSeries,
    benchmarkSeries,
    summary,
    assetRows,
    monthlyTableData,
    isLoading,
    isError,
    error,
    refetch,
    hasPositions: historical.points.length > 0 || wealth.hasPositions,
    hasHistory: historical.points.length > 0,
    usdRateIsFallback: usdRateQuery.data?.isFallback ?? wealth.usdRateIsFallback,
  }
}
