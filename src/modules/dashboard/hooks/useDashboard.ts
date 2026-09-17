import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useWealthHistory } from '../../wealth/hooks/useWealthHistory'
import { useFixedIncomePositions } from '../../portfolio/hooks/useFixedIncomePositions'
import { dividendService } from '../../dividends/services/dividendService'
import { positionService } from '../../portfolio/services/positionService'
import { deriveComposition } from '../../portfolio/composition'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { INTERNATIONAL_TYPES } from '../../portfolio/composition'
import type { PositionRow, AssetClassSlice } from '../../portfolio/types'
import type { PositionSnapshot } from '../../wealth/types'

const STALE_TIME_MS = 5 * 60 * 1000

/** Agrega a série diária de patrimônio em pontos mensais (último valor não-nulo do mês). */
export function aggregateMonthly(
  series: Array<{ date: string; value: number | null }>,
): Array<{ month: string; value: number | null }> {
  const monthMap = new Map<string, number | null>()

  for (const point of series) {
    const month = point.date.slice(0, 7)
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

/** Constrói PositionRow[] mínimos para deriveComposition (renda variável). */
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
      const needsConversion =
        pos.currency === 'USD' &&
        pos.type !== null &&
        (INTERNATIONAL_TYPES as readonly string[]).includes(pos.type)
      const priceInBRL = needsConversion ? close * usdRate : close
      marketValueBRL = priceInBRL * pos.quantity
      if (!Number.isFinite(marketValueBRL)) marketValueBRL = null
    }

    if (marketValueBRL !== null) totalBRL += marketValueBRL

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
  /** Patrimônio total atual em BRL (renda variável + renda fixa). `null` sem cotações. */
  totalPatrimonioBRL: number | null
  /** Custo total: preço médio × qtd (renda variável) + principal (renda fixa). */
  valorInvestidoBRL: number | null
  /** Ganho de capital = patrimônio − valor investido. */
  ganhoCapitalBRL: number | null
  /** Lucro total = ganho de capital + proventos recebidos. */
  lucroTotalBRL: number | null
  /** Soma dos proventos recebidos nos últimos 12 meses. */
  proventos12mBRL: number | null
  /** Variação % do patrimônio nos últimos 12M (série histórica). */
  variacaoPct: number | null
  /** Rentabilidade Total = (patrimônio - custo) / custo. Sempre disponível. */
  rentabilidadeTotalPct: number | null
  /** Série mensal para o gráfico de barras (desde o início da carteira). */
  monthlySeries: Array<{ month: string; totalBRL: number | null; investedBRL: number | null }>
  /** Fatias da composição por classe para a pizza (renda variável). */
  compositionSlices: AssetClassSlice[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useDashboard(): DashboardData {
  const { user } = useAuth()
  const userId = user?.id

  // ── Série histórica de renda variável ────────────────────────────────────
  // Período "Tudo" (365 dias) — mostra o máximo de histórico disponível
  const wealth = useWealthHistory('Tudo')

  // ── Renda fixa ───────────────────────────────────────────────────────────
  const fi = useFixedIncomePositions()
  const fiTotalBRL = fi.totalBRL
  const fiPrincipalBRL = useMemo(
    () => fi.rows.reduce((sum, r) => sum + r.principal, 0),
    [fi.rows],
  )

  // ── Posições completas (com average_price para valor investido) ───────────
  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions', userId],
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })
  const positions = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data])

  // ── Proventos 12M ─────────────────────────────────────────────────────────
  const tickers = useMemo(() => positions.map((p) => p.ticker).sort(), [positions])

  // Sempre busca os últimos 12 meses completos — independente de earliestDate,
  // que pode ser recente (set/26), enquanto dividendos podem ter sido pagos
  // em dez/25 para ativos que o usuário tinha antes de cadastrar no Valora.
  const sinceProventos = useMemo(() => shiftIsoDate(-365), [])

  const dividendsQuery = useQuery({
    queryKey: ['dashboard', 'dividends-12m', userId, tickers],
    queryFn: () => dividendService.listDividendsByTickers(tickers, sinceProventos),
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: STALE_TIME_MS,
  })

  // ── Patrimônio atual ──────────────────────────────────────────────────────
  // Calculado diretamente dos últimos preços (lastPricesMap) + renda fixa.
  // NÃO usa o último ponto da série histórica para evitar distorção por gaps.
  const totalPatrimonioBRL = useMemo(() => {
    const usdRate = wealth.usdRate || 5
    let total = 0
    let hasAny = false

    for (const pos of wealth.positions) {
      const close = wealth.lastPricesMap.get(pos.ticker)
      if (close === undefined || !Number.isFinite(close) || close <= 0) continue

      const needsConversion =
        pos.currency === 'USD' &&
        pos.type !== null &&
        (INTERNATIONAL_TYPES as readonly string[]).includes(pos.type)

      const priceInBRL = needsConversion ? close * usdRate : close
      const value = priceInBRL * pos.quantity

      if (Number.isFinite(value) && value > 0) {
        total += value
        hasAny = true
      }
    }

    if (fiTotalBRL > 0) {
      total += fiTotalBRL
      hasAny = true
    }

    return hasAny ? total : null
  }, [wealth.positions, wealth.lastPricesMap, wealth.usdRate, fiTotalBRL])

  // ── Valor investido ───────────────────────────────────────────────────────
  const valorInvestidoBRL = useMemo(() => {
    const usdRate = wealth.usdRate || 5
    let total = 0

    for (const pos of positions) {
      const currency = pos.asset?.currency ?? 'BRL'
      const needsConversion =
        currency === 'USD' &&
        pos.asset?.type !== null &&
        (INTERNATIONAL_TYPES as readonly string[]).includes(pos.asset?.type ?? '')
      const rate = needsConversion ? usdRate : 1
      total += Number(pos.average_price) * Number(pos.quantity) * rate
    }

    total += fiPrincipalBRL

    return Number.isFinite(total) && total > 0 ? total : null
  }, [positions, wealth.usdRate, fiPrincipalBRL])

  // ── Ganho de capital ──────────────────────────────────────────────────────
  const ganhoCapitalBRL = useMemo(() => {
    if (totalPatrimonioBRL === null || valorInvestidoBRL === null) return null
    return totalPatrimonioBRL - valorInvestidoBRL
  }, [totalPatrimonioBRL, valorInvestidoBRL])

  // ── Proventos 12M ─────────────────────────────────────────────────────────
  const proventos12mBRL = useMemo(() => {
    const rawRows = dividendsQuery.data ?? []
    const qtyMap = new Map(positions.map((p) => [p.ticker, Number(p.quantity)]))
    const total = rawRows.reduce((acc, r) => {
      const qty = qtyMap.get(r.ticker) ?? 0
      return acc + Number(r.value_per_share) * qty
    }, 0)
    return total > 0 ? total : null
  }, [dividendsQuery.data, positions])

  // ── Lucro total = ganho de capital + proventos ────────────────────────────
  const lucroTotalBRL = useMemo(() => {
    if (ganhoCapitalBRL === null && proventos12mBRL === null) return null
    return (ganhoCapitalBRL ?? 0) + (proventos12mBRL ?? 0)
  }, [ganhoCapitalBRL, proventos12mBRL])

  // ── Variação % 12M ───────────────────────────────────────────────────────
  // Retorno da série histórica a partir de latestDate (ou earliestDate).
  // Usa 1 ou mais pontos — não exige 12 meses cheios. Se a carteira tem
  // só 1 dia de dados, compara o patrimônio atual com esse único ponto.
  const variacaoPct = useMemo(() => {
    if (totalPatrimonioBRL === null) return null

    const anchor = wealth.latestDate ?? wealth.earliestDate
    if (!anchor) return null

    const validFromAnchor = wealth.series.filter(
      (p) => p.value !== null && p.value > 0 && p.date >= anchor,
    )

    if (validFromAnchor.length === 0) return null

    const first = validFromAnchor[0].value!
    if (first <= 0) return null
    return ((totalPatrimonioBRL - first) / first) * 100
  }, [totalPatrimonioBRL, wealth.series, wealth.latestDate, wealth.earliestDate])

  // ── Rentabilidade Total ───────────────────────────────────────────────────
  // (patrimônio atual - custo total) / custo total
  // Sempre disponível quando há patrimônio e custo.
  const rentabilidadeTotalPct = useMemo(() => {
    if (totalPatrimonioBRL === null || valorInvestidoBRL === null || valorInvestidoBRL <= 0) return null
    return ((totalPatrimonioBRL - valorInvestidoBRL) / valorInvestidoBRL) * 100
  }, [totalPatrimonioBRL, valorInvestidoBRL])

  // ── Série mensal para o gráfico ───────────────────────────────────────────
  // Filtra por latestDate para evitar barras com patrimônio parcial.
  // Se não há pontos após latestDate (série carregando ou carteira de 1 dia),
  // cai de volta para earliestDate como âncora.
  const monthlySeries = useMemo(() => {
    const monthly = aggregateMonthly(wealth.series)
    if (monthly.length === 0) return []

    const investedBRL = valorInvestidoBRL

    const toPoints = (data: typeof monthly) =>
      data.map(({ month, value }) => ({
        month,
        totalBRL: value,
        investedBRL: value !== null && investedBRL !== null
          ? Math.min(investedBRL, value)
          : investedBRL,
      }))

    // Tenta filtrar pelo mês da última aquisição (carteira completa)
    const anchor = wealth.latestDate ?? wealth.earliestDate
    const anchorMonth = anchor ? anchor.slice(0, 7) : null

    if (anchorMonth) {
      const filtered = monthly.filter(({ month }) => month >= anchorMonth)
      if (filtered.length > 0) return toPoints(filtered)
    }

    // Fallback: usa todos os pontos disponíveis
    return toPoints(monthly)
  }, [wealth.series, wealth.latestDate, wealth.earliestDate, valorInvestidoBRL])

  // ── Composição para pizza ─────────────────────────────────────────────────
  // Usa lastPricesMap diretamente (não a série histórica) para garantir que
  // todos os ativos com cotação aparecem na composição.
  const compositionSlices = useMemo(() => {
    if (wealth.positions.length === 0) return []
    const usdRate = wealth.usdRate || 5
    const { rows, totalBRL } = buildRowsForComposition(
      wealth.positions,
      wealth.lastPricesMap,
      usdRate,
    )
    if (totalBRL <= 0) return []
    const derived = deriveComposition(rows, totalBRL)
    return derived.slices
  }, [wealth.positions, wealth.lastPricesMap, wealth.usdRate])

  // ── Estado ────────────────────────────────────────────────────────────────
  const isLoading =
    wealth.isLoading ||
    positionsQuery.isLoading ||
    dividendsQuery.isLoading ||
    fi.isLoading

  const isError =
    wealth.isError ||
    positionsQuery.isError ||
    dividendsQuery.isError ||
    fi.isError

  const refetch = () => {
    wealth.refetch()
    void positionsQuery.refetch()
    void dividendsQuery.refetch()
  }

  return {
    totalPatrimonioBRL,
    valorInvestidoBRL,
    ganhoCapitalBRL,
    lucroTotalBRL,
    proventos12mBRL,
    variacaoPct,
    rentabilidadeTotalPct,
    monthlySeries,
    compositionSlices,
    isLoading,
    isError,
    refetch,
  }
}
