import { useHistoricalReturns } from './useHistoricalReturns'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { useWealthHistory } from '../../wealth/hooks/useWealthHistory'
import { positionService } from '../../portfolio/services/positionService'
import { dividendService } from '../../dividends/services/dividendService'
import { benchmarkService } from '../services/benchmarkService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import {
  computeAssetRows,
  computeMonthlyBenchmarkReturns,
  buildMonthlyAccumulatedSeries,
  buildIntramonthlyBenchmarkSeries,
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

/**
 * Dias por período — mesma tabela de `useWealthHistory`.
 * "Tudo" usa a primeira aquisição, sem teto de um ano.
 */
const PERIOD_DAYS: Record<Exclude<PerformancePeriod, 'Tudo'>, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1A': 365,
}

/** Configuração dos benchmarks: nome na tabela, rótulo no UI e cor da linha. */
const BENCHMARK_CONFIG = [
  { name: 'CDI',  label: 'CDI',  color: '#22c55e' },
  { name: 'IBOV', label: 'IBOV', color: '#eab308' },
  { name: 'IFIX', label: 'IFIX', color: '#f97316' },
] as const

export function performanceQueryKey(userId: string | undefined, period: PerformancePeriod) {
  return ['performance', 'return', userId, period] as const
}

export interface UsePerformanceResult {
  historyIncomplete?: boolean
  /** Série da carteira (acumulada mês a mês, base 100). */
  portfolioSeries: PerformanceSeries
  /** Séries dos benchmarks (acumuladas mês a mês, base 100). */
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

  // Piso do período selecionado
  const periodFloor = useMemo(
    () => shiftIsoDate(period === 'Tudo' ? 0 : -PERIOD_DAYS[period]),
    [period],
  )

  // `since` efetivo: nunca antes da primeira compra
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
    return period === 'Tudo' ? prevMonth : prevMonth < periodFloor ? periodFloor : prevMonth
  }, [since, periodFloor, period])

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
  const useIntramonthlyfallback = portfolioMonthlyReturns.size === 0
  const portfolioSeries = useMemo<PerformanceSeries>(() => {
    if (historical.incomplete || historical.isLoading || historical.isError) return { label: 'Carteira', color: '#3b82f6', points: [] }
    if (!useIntramonthlyfallback) return buildMonthlyAccumulatedSeries(portfolioMonthlyReturns, 'Carteira', '#3b82f6')
    if (historical.returnPct === null || !historical.startDate) return { label: 'Carteira', color: '#3b82f6', points: [] }
    let factor = 100
    const points = [{ date: historical.startDate, normalized: 100 }]
    for (const point of historical.points.filter(p => p.date >= historical.since)) {
      if (point.returnPct === null) return { label: 'Carteira', color: '#3b82f6', points: [] }
      factor *= 1 + point.returnPct
      points.push({ date: point.date, normalized: factor })
    }
    return { label: 'Carteira', color: '#3b82f6', points }
  }, [historical.incomplete, historical.isLoading, historical.isError, historical.returnPct, historical.startDate, historical.points, historical.since, useIntramonthlyfallback, portfolioMonthlyReturns])
  const portfolioReturnPct = historical.returnPct
  const portfolioStartDate = historical.startDate

  const benchmarkSeries = useMemo<PerformanceSeries[]>(() => {
    const rows = benchmarksQuery.data ?? []

    return BENCHMARK_CONFIG.map(({ name, label, color }) => {
      if (useIntramonthlyfallback) {
        // Fallback: série diária normalizada a partir de portfolioStartDate
        return buildIntramonthlyBenchmarkSeries(
          rows as Array<{ date: string; name: string; value: number }>,
          name,
          label,
          color,
          portfolioStartDate ?? since,
        )
      }

      // Cálculo MoM alinhado pelos meses da carteira
      const nameRows = rows
        .filter((r) => r.name === name)
        .map((r) => ({ date: r.date, value: Number(r.value) }))

      const monthlyReturns = computeMonthlyBenchmarkReturns(nameRows)
      const portfolioMonths = new Set(portfolioMonthlyReturns.keys())
      const alignedReturns = new Map<string, number>()
      for (const [month, ret] of monthlyReturns) {
        if (portfolioMonths.has(month)) alignedReturns.set(month, ret)
      }
      return buildMonthlyAccumulatedSeries(alignedReturns, label, color)
    })
  }, [benchmarksQuery.data, useIntramonthlyfallback, portfolioMonthlyReturns, portfolioStartDate, since])

  // Resumo para os cards
  const summary = useMemo<PerformanceSummary>(() => {
    const [cdiSeries, ibovSeries, ifixSeries] = benchmarkSeries

    const toReturn = (s: PerformanceSeries): number | null => extractReturnPct(s)

    const cdiReturnPct  = cdiSeries  ? toReturn(cdiSeries)  : null
    const ibovReturnPct = ibovSeries ? toReturn(ibovSeries) : null
    const ifixReturnPct = ifixSeries ? toReturn(ifixSeries) : null

    const vscdipPp =
      portfolioReturnPct !== null && cdiReturnPct !== null
        ? (portfolioReturnPct - cdiReturnPct) * 100
        : null

    return { portfolioReturnPct, cdiReturnPct, ibovReturnPct, ifixReturnPct, vscdipPp }
  }, [portfolioReturnPct, benchmarkSeries])

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
