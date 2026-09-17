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
  computeMonthlyPortfolioReturns,
  computeMonthlyBenchmarkReturns,
  buildMonthlyAccumulatedSeries,
  accumulatedReturnFromMonthly,
  buildIntramonthlySeries,
  buildIntramonthlyBenchmarkSeries,
  extractReturnPct,
  normalizeToBase100,
  computeMonthlyTableData,
} from '../utils/performanceCalculations'
import { INTERNATIONAL_TYPES } from '../../portfolio/composition'
import type { PerformancePeriod, PerformanceSeries, PerformanceSummary, AssetReturnRow } from '../types'
import type { MonthlyTableRow } from '../utils/performanceCalculations'
import type { PositionWithAsset } from '../../portfolio/types'
import type { DividendRaw } from '../../dividends/types'
import type { WealthPeriod } from '../../wealth/types'

/** staleTime de 5 minutos — dados de baixa frequência. */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Dias por período — mesma tabela de `useWealthHistory`.
 * "Tudo" usa 365 como janela máxima (AD-11).
 */
const PERIOD_DAYS: Record<PerformancePeriod, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1A': 365,
  'Tudo': 365,
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

/**
 * Hook principal da tela Rentabilidade.
 *
 * Usa cálculo **mês a mês** (estilo Investidor10):
 * - Retorno de cada mês = valorFimMês / valorFimMêsAnterior − 1
 * - Série acumulada = composição dos retornos mensais (base 100)
 * - Benchmarks seguem o mesmo algoritmo com seus valores diários
 *
 * Isso torna benchmarks e carteira independentes de datas exatas,
 * eliminando problemas de lag D+1 e fins de semana.
 */
export function usePerformance(period: PerformancePeriod): UsePerformanceResult {
  const { user } = useAuth()
  const userId = user?.id

  // 1. Série de patrimônio diário + posições snapshot + USD rate
  const wealth = useWealthHistory(period as WealthPeriod)

  // Piso do período selecionado
  const periodFloor = useMemo(
    () => shiftIsoDate(-PERIOD_DAYS[period]),
    [period],
  )

  // `since` efetivo: nunca antes da primeira compra
  const since = useMemo(() => {
    if (wealth.earliestDate && wealth.earliestDate > periodFloor) {
      return wealth.earliestDate
    }
    return periodFloor
  }, [periodFloor, wealth.earliestDate])

  // 2. Posições completas (com average_price para computeAssetRows)
  const positionsQuery = useQuery<PositionWithAsset[]>({
    queryKey: ['portfolio', 'positions', userId],
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })

  const positions = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data],
  )

  const tickers = useMemo(
    () => positions.map((p) => p.ticker).sort(),
    [positions],
  )

  // 3. Dividendos do período
  const dividendsQuery = useQuery<DividendRaw[]>({
    queryKey: ['performance', 'dividends', userId, period, tickers],
    queryFn: () =>
      tickers.length > 0
        ? dividendService.listDividendsByTickers(tickers, since)
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
    return prevMonth < periodFloor ? periodFloor : prevMonth
  }, [since, periodFloor])

  const benchmarksQuery = useQuery({
    queryKey: ['benchmarks', period, benchmarkSince],
    queryFn: () => benchmarkService.listBenchmarks(benchmarkSince),
    enabled: Boolean(userId) && !wealth.isLoading,
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

  // --- Derivações client-side ---
  //
  // Estratégia dual:
  // - ≥ 2 meses de dados → cálculo mês a mês acumulado (estilo Investidor10)
  // - < 2 meses (carteira nova, período 1M dentro do mês corrente) → fallback
  //   intra-mês: normaliza dia a dia a partir do primeiro ponto disponível

  const portfolioMonthlyReturns = useMemo(
    () => computeMonthlyPortfolioReturns(wealth.series),
    [wealth.series],
  )

  // true quando não há meses suficientes para o cálculo MoM
  const useIntramonthlyfallback = portfolioMonthlyReturns.size === 0

  // Série da carteira
  const portfolioSeries = useMemo<PerformanceSeries>(() => {
    if (useIntramonthlyfallback) {
      return buildIntramonthlySeries(wealth.series, 'Carteira', '#3b82f6')
    }
    return buildMonthlyAccumulatedSeries(portfolioMonthlyReturns, 'Carteira', '#3b82f6')
  }, [useIntramonthlyfallback, wealth.series, portfolioMonthlyReturns])

  // Retorno acumulado da carteira para os cards
  const portfolioReturnPct = useMemo(() => {
    if (useIntramonthlyfallback) {
      // Intra-mês: (últimoPonto / primeiroPonto) − 1
      const pts = normalizeToBase100(wealth.series)
      if (pts.length === 0) return null
      const last = pts[pts.length - 1]
      if (!last || !Number.isFinite(last.normalized)) return null
      return last.normalized / 100 - 1
    }
    return accumulatedReturnFromMonthly(portfolioMonthlyReturns)
  }, [useIntramonthlyfallback, wealth.series, portfolioMonthlyReturns])

  // Data do primeiro ponto válido — para ancorar o fallback dos benchmarks
  const portfolioStartDate = useMemo(() => {
    const first = wealth.series.find((p) => p.value !== null && Number.isFinite(p.value))
    return first?.date ?? null
  }, [wealth.series])

  // Séries dos benchmarks
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
    () => computeMonthlyTableData(portfolioMonthlyReturns),
    [portfolioMonthlyReturns],
  )

  const isLoading =
    wealth.isLoading ||
    positionsQuery.isLoading ||
    dividendsQuery.isLoading ||
    benchmarksQuery.isLoading

  const isError =
    wealth.isError ||
    positionsQuery.isError ||
    dividendsQuery.isError ||
    benchmarksQuery.isError

  const error = (
    (positionsQuery.error ?? benchmarksQuery.error ?? dividendsQuery.error) as Error | null
  )

  const refetch = () => {
    void wealth.refetch()
    void positionsQuery.refetch()
    void benchmarksQuery.refetch()
  }

  return {
    portfolioSeries,
    benchmarkSeries,
    summary,
    assetRows,
    monthlyTableData,
    isLoading,
    isError,
    error,
    refetch,
    hasPositions: wealth.hasPositions,
    hasHistory: wealth.hasHistory,
    usdRateIsFallback: usdRateQuery.data?.isFallback ?? wealth.usdRateIsFallback,
  }
}
