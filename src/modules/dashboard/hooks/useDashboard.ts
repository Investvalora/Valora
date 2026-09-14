import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useWealthHistory } from '../../wealth/hooks/useWealthHistory'
import { dividendService } from '../../dividends/services/dividendService'
import { positionService } from '../../portfolio/services/positionService'
import { deriveComposition } from '../../portfolio/composition'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import type { PositionRow } from '../../portfolio/types'
import type { PositionSnapshot } from '../../wealth/types'
import type { AssetClassSlice } from '../../portfolio/types'

const STALE_TIME_MS = 5 * 60 * 1000

/** Agrega a série diária de patrimônio em pontos mensais (último valor não-nulo do mês). */
export function aggregateMonthly(
  series: Array<{ date: string; value: number | null }>,
): Array<{ month: string; value: number | null }> {
  const monthMap = new Map<string, number | null>()

  for (const point of series) {
    const month = point.date.slice(0, 7) // YYYY-MM
    if (point.value !== null && Number.isFinite(point.value)) {
      monthMap.set(month, point.value)
    } else if (!monthMap.has(month)) {
      monthMap.set(month, null)
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }))
}

/** Constrói PositionRow[] mínimos para deriveComposition. */
function buildRowsForComposition(
  positions: PositionSnapshot[],
  lastPricesMap: Map<string, number>,
  usdRate: number,
): { rows: PositionRow[]; totalBRL: number } {
  let totalBRL = 0

  const rows: PositionRow[] = positions.map((pos) => {
    const close = lastPricesMap.get(pos.ticker)
    let marketValueBRL: number | null = null

    if (close !== undefined && Number.isFinite(close)) {
      const priceInBRL = pos.currency === 'USD' ? close * usdRate : close
      marketValueBRL = priceInBRL * pos.quantity
      if (Number.isFinite(marketValueBRL)) totalBRL += marketValueBRL
      else marketValueBRL = null
    }

    return {
      id: pos.ticker,
      ticker: pos.ticker,
      name: null,
      currency: pos.currency,
      type: pos.type,
      quantity: pos.quantity,
      averagePrice: 0,
      acquisitionDate: '',
      quote: null,
      quotePrice: Number.NaN,
      marketValueBRL,
      weightPercent: null,
      changePercent: null,
      isStaleQuote: false,
      usesUSDRate: pos.currency === 'USD',
    } satisfies PositionRow
  })

  return { rows, totalBRL }
}

export interface DashboardData {
  /** Patrimônio total atual em BRL. `null` se não houver cotações. */
  totalPatrimonioBRL: number | null
  /** Custo de aquisição total (preço médio × quantidade) em BRL. */
  valorInvestidoBRL: number | null
  /** Ganho de capital = patrimônio − valor investido. */
  ganhoCapitalBRL: number | null
  /** Soma dos proventos recebidos nos últimos 12 meses. */
  proventos12mBRL: number | null
  /** Variação % do patrimônio vs período anterior (12M). */
  variacaoPct: number | null
  /** Série mensal para o gráfico de barras. */
  monthlySeries: Array<{ month: string; totalBRL: number | null; investedBRL: number | null }>
  /** Fatias da composição por classe para a pizza. */
  compositionSlices: AssetClassSlice[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useDashboard(): DashboardData {
  const { user } = useAuth()
  const userId = user?.id

  // ── Série de patrimônio 12 meses ─────────────────────────────────────────
  const wealth = useWealthHistory('1A')

  // ── Posições com preço médio (para valor investido) ───────────────────────
  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions', userId],
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })

  const positions = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data])

  // ── Proventos 12 meses ────────────────────────────────────────────────────
  const tickers = useMemo(
    () => positions.map((p) => p.ticker).sort(),
    [positions],
  )

  const since12m = useMemo(() => shiftIsoDate(-365, new Date()), [])

  const dividendsQuery = useQuery({
    queryKey: ['dashboard', 'dividends-12m', userId, tickers],
    queryFn: () => dividendService.listDividendsByTickers(tickers, since12m),
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: STALE_TIME_MS,
  })

  // ── Derivações ─────────────────────────────────────────────────────────────

  // Patrimônio total atual = último valor da série
  const totalPatrimonioBRL = useMemo(() => {
    const last = [...wealth.series].reverse().find((p) => p.value !== null)
    return last?.value ?? null
  }, [wealth.series])

  // Valor investido = Σ (avgPrice × qty) — na moeda original, converte USD→BRL
  const valorInvestidoBRL = useMemo(() => {
    if (positions.length === 0) return null
    const usdRate = wealth.usdRate || 5
    let total = 0
    for (const pos of positions) {
      const currency = pos.asset?.currency ?? 'BRL'
      const rate = currency === 'USD' ? usdRate : 1
      total += Number(pos.average_price) * Number(pos.quantity) * rate
    }
    return Number.isFinite(total) && total > 0 ? total : null
  }, [positions, wealth.usdRate])

  // Ganho de capital = patrimônio - valor investido
  const ganhoCapitalBRL = useMemo(() => {
    if (totalPatrimonioBRL === null || valorInvestidoBRL === null) return null
    return totalPatrimonioBRL - valorInvestidoBRL
  }, [totalPatrimonioBRL, valorInvestidoBRL])

  // Proventos 12M
  const proventos12mBRL = useMemo(() => {
    const rawRows = dividendsQuery.data ?? []
    const qtyMap = new Map(positions.map((p) => [p.ticker, Number(p.quantity)]))
    return rawRows.reduce((acc, r) => {
      const qty = qtyMap.get(r.ticker) ?? 0
      return acc + Number(r.value_per_share) * qty
    }, 0) || null
  }, [dividendsQuery.data, positions])

  // Variação % (último vs primeiro valor da série)
  const variacaoPct = useMemo(() => {
    const validPoints = wealth.series.filter((p) => p.value !== null && p.value > 0)
    if (validPoints.length < 2) return null
    const first = validPoints[0].value!
    const last = validPoints[validPoints.length - 1].value!
    return ((last - first) / first) * 100
  }, [wealth.series])

  // Série mensal — totalBRL + investedBRL por mês
  const monthlySeries = useMemo(() => {
    const monthly = aggregateMonthly(wealth.series)
    const investedBRL = valorInvestidoBRL // constante: posição atual
    return monthly.map(({ month, value }) => ({
      month,
      totalBRL: value,
      investedBRL: value !== null && investedBRL !== null
        ? Math.min(investedBRL, value) // valor aplicado ≤ patrimônio
        : investedBRL,
    }))
  }, [wealth.series, valorInvestidoBRL])

  // Composição para pizza
  const compositionSlices = useMemo(() => {
    if (wealth.positions.length === 0) return []
    const { rows, totalBRL } = buildRowsForComposition(
      wealth.positions,
      wealth.lastPricesMap,
      wealth.usdRate || 5,
    )
    if (totalBRL <= 0) return []
    return deriveComposition(rows, totalBRL).slices
  }, [wealth.positions, wealth.lastPricesMap, wealth.usdRate])

  const isLoading = wealth.isLoading || positionsQuery.isLoading || dividendsQuery.isLoading
  const isError = wealth.isError || positionsQuery.isError || dividendsQuery.isError

  const refetch = () => {
    wealth.refetch()
    void positionsQuery.refetch()
    void dividendsQuery.refetch()
  }

  return {
    totalPatrimonioBRL,
    valorInvestidoBRL,
    ganhoCapitalBRL,
    proventos12mBRL,
    variacaoPct,
    monthlySeries,
    compositionSlices,
    isLoading,
    isError,
    refetch,
  }
}
