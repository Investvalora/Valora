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
  normalizeToBase100,
  computePortfolioReturn,
  buildBenchmarkSeries,
  extractReturnPct,
} from '../utils/performanceCalculations'
import { INTERNATIONAL_TYPES } from '../../portfolio/composition'
import type { PerformancePeriod, PerformanceSeries, PerformanceSummary } from '../types'
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
  /** Série da carteira normalizada a 100, para o gráfico. */
  portfolioSeries: PerformanceSeries
  /** Séries dos benchmarks normalizadas a 100, para o gráfico. */
  benchmarkSeries: PerformanceSeries[]
  /** Resumo de retornos para os cards. */
  summary: PerformanceSummary
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
 * Orquestra:
 * 1. `useWealthHistory` — série temporal de patrimônio + posições + USD rate
 * 2. `positionService.listPositions` — average_price para cálculo de aportes
 * 3. `useDividends` — proventos recebidos no período
 * 4. `benchmarkService.listBenchmarks` — séries de CDI, IBOV e IFIX
 *
 * Toda a derivação (normalização, cálculo de retorno, resumo) é client-side
 * em `useMemo` — conforme classificação AD-5.
 */
export function usePerformance(period: PerformancePeriod): UsePerformanceResult {
  const { user } = useAuth()
  const userId = user?.id

  const since = useMemo(
    () => shiftIsoDate(-PERIOD_DAYS[period]),
    [period],
  )

  // 1. Série de patrimônio + posições snapshot + USD rate
  const wealth = useWealthHistory(period as WealthPeriod)

  // 2. Posições completas (com average_price para aportes)
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

  // 3. Dividendos do período — query direta ao service para suportar todos os
  //    períodos de WealthPeriod (incluindo 1M e 3M que DividendPeriod não aceita)
  const dividendsQuery = useQuery<DividendRaw[]>({
    queryKey: ['performance', 'dividends', userId, period, tickers],
    queryFn: () =>
      tickers.length > 0
        ? dividendService.listDividendsByTickers(tickers, since)
        : Promise.resolve([]),
    enabled: Boolean(userId) && !wealth.isLoading,
    staleTime: STALE_TIME_MS,
  })

  // Enriquece as linhas brutas com quantity e total_value client-side
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

  // 4. Benchmarks
  const benchmarksQuery = useQuery({
    queryKey: ['benchmarks', period],
    queryFn: () => benchmarkService.listBenchmarks(since),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })

  // 5. USD rate — reusa o valor já carregado por useWealthHistory via cache
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

  // Série da carteira normalizada
  const portfolioSeries = useMemo<PerformanceSeries>(() => {
    const points = normalizeToBase100(wealth.series)
    return { label: 'Carteira', color: '#3b82f6', points }
  }, [wealth.series])

  // Séries dos benchmarks normalizadas
  const benchmarkSeries = useMemo<PerformanceSeries[]>(() => {
    const rows = benchmarksQuery.data ?? []
    return buildBenchmarkSeries(rows, [...BENCHMARK_CONFIG])
  }, [benchmarksQuery.data])

  // Retorno acumulado da carteira
  const portfolioReturnPct = useMemo(
    () => computePortfolioReturn(wealth.series, dividendRows, positions),
    [wealth.series, dividendRows, positions],
  )

  // Resumo para os cards
  const summary = useMemo<PerformanceSummary>(() => {
    const cdiSeries  = benchmarkSeries.find((s) => s.label === 'CDI')
    const ibovSeries = benchmarkSeries.find((s) => s.label === 'IBOV')
    const ifixSeries = benchmarkSeries.find((s) => s.label === 'IFIX')

    const cdiReturnPct  = cdiSeries  ? extractReturnPct(cdiSeries)  : null
    const ibovReturnPct = ibovSeries ? extractReturnPct(ibovSeries) : null
    const ifixReturnPct = ifixSeries ? extractReturnPct(ifixSeries) : null

    const vscdipPp =
      portfolioReturnPct !== null && cdiReturnPct !== null
        ? (portfolioReturnPct - cdiReturnPct) * 100
        : null

    return { portfolioReturnPct, cdiReturnPct, ibovReturnPct, ifixReturnPct, vscdipPp }
  }, [portfolioReturnPct, benchmarkSeries])

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
    isLoading,
    isError,
    error,
    refetch,
    hasPositions: wealth.hasPositions,
    hasHistory: wealth.hasHistory,
    usdRateIsFallback: usdRateQuery.data?.isFallback ?? wealth.usdRateIsFallback,
  }
}
