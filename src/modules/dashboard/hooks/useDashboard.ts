import { useHistoricalReturns } from '../../performance/hooks/useHistoricalReturns'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWalletTotals } from '../../portfolio/hooks/useWalletTotals'
import { buildMonthlyWealth } from '../monthlyWealth'
import { transactionsService } from '../../portfolio/services/transactionsService'
import { wealthService } from '../../wealth/services/wealthService'
import { historicalRatesService } from '../services/historicalRatesService'
import { fixedIncomePrincipalAt } from '../historicalValuation'
import { useFixedIncomeHistory } from '../../portfolio/hooks/useFixedIncomeHistory'
import { useAuth } from '../../auth/hooks/useAuth'
import { useWealthHistory } from '../../wealth/hooks/useWealthHistory'
import { useFixedIncomePositions } from '../../portfolio/hooks/useFixedIncomePositions'
import { useDividends } from '../../dividends/hooks/useDividends'
import { positionService } from '../../portfolio/services/positionService'
import { deriveComposition } from '../../portfolio/composition'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import type { AssetClassSlice } from '../../portfolio/types'
import type { AssetType } from '../../portfolio/types'

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

export interface DashboardData {
  historyIssues?: string[]
  historyIncomplete?: boolean
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
  /** Retorno histórico desde o início, com a mesma fórmula de Desempenho. */
  rentabilidadeTotalPct: number | null
  /** Série mensal para o gráfico de barras (desde o início da carteira). */
  monthlySeries: Array<{ month: string; totalBRL: number | null; investedBRL: number | null }>
  /** Fatias da composição por classe para a pizza (renda variável). */
  compositionSlices: AssetClassSlice[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export interface WealthChartFilters {
  from?: string
  to?: string
  type?: AssetType | 'all'
}

export function useDashboard(walletId?: string, chartFilters?: WealthChartFilters): DashboardData {
  const { user } = useAuth()
  const userId = user?.id

  // ── Série histórica de renda variável ────────────────────────────────────
  // Histórico completo para o gráfico; métricas usam períodos independentes do filtro.
  const current = useWalletTotals()
  const wealth = useWealthHistory('Tudo', walletId, chartFilters?.from)
  const performanceHistory = useHistoricalReturns('Tudo', walletId)
  const annualHistory = useHistoricalReturns('1A', walletId)
  const transactionsQuery = useQuery({
    queryKey: ['portfolio', 'transactions-all', userId, walletId],
    queryFn: () => transactionsService.listAll(userId!, walletId),
    enabled: Boolean(userId) && walletId !== '',
    staleTime: STALE_TIME_MS,
  })
  const historicalAssets = useQuery({
    queryKey: ['dashboard', 'historical-assets', [...new Set((transactionsQuery.data ?? []).map((row) => row.ticker))].sort()],
    queryFn: async () => Promise.all([...new Set((transactionsQuery.data ?? []).map((row) => row.ticker))].map((ticker) => positionService.findAssetByTicker(ticker))),
    enabled: transactionsQuery.isSuccess,
    staleTime: STALE_TIME_MS,
  })
  const historicalPrices = useQuery({
    queryKey: ['dashboard', 'historical-prices', userId, walletId, transactionsQuery.dataUpdatedAt],
    queryFn: () => {
      const trades = (transactionsQuery.data ?? []).filter((row) => row.type === 'buy' || row.type === 'sell')
      const first = trades.map((row) => row.transaction_date).sort()[0]
      const tickers = [...new Set(trades.flatMap(row => row.ticker.endsWith('-BRL')
        ? [row.ticker, row.ticker.slice(0, -4)] : [row.ticker]))]
      return first ? wealthService.listPriceHistory(tickers, first) : Promise.resolve([])
    },
    enabled: transactionsQuery.isSuccess,
    staleTime: STALE_TIME_MS,
  })

  // ── Renda fixa ───────────────────────────────────────────────────────────
  const fi = useFixedIncomePositions(walletId)
  const fiHistory = useFixedIncomeHistory(walletId)
  const historicalFixed = useMemo(() => (fiHistory.data?.positions ?? []).map((position) => ({ ...position, events: (fiHistory.data?.events ?? []).filter((event) => event.position_id === position.id) })), [fiHistory.data])
  const fiPrincipalBRL = useMemo(
    () => fi.rows.reduce((sum, r) => sum + r.principal, 0),
    [fi.rows],
  )

  // ── Posições completas (com average_price para valor investido) ───────────
  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions', userId, walletId],
    queryFn: () => positionService.listPositions(userId as string, walletId),
    enabled: Boolean(userId) && walletId !== '',
    staleTime: STALE_TIME_MS,
  })
  const positions = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data])
  const historyFrom = [...positions.map((row) => row.acquisition_date), ...(transactionsQuery.data ?? []).map((row) => row.transaction_date), ...historicalFixed.map((row) => row.application_date)].sort()[0]
  const historyTo = chartFilters?.to && chartFilters.to < new Date().toISOString().slice(0, 10) ? chartFilters.to : new Date().toISOString().slice(0, 10)
  const rateFrom = historyFrom ? shiftIsoDate(-10, new Date(`${historyFrom}T12:00:00Z`)) : historyTo
  const hasHistoricalUsd = positions.some((row) => row.asset?.currency === 'USD' || row.asset?.type === 'crypto') || (historicalAssets.data ?? []).some((asset) => asset?.currency === 'USD' || asset?.type === 'crypto')
  const historicalRates = useQuery({
    queryKey: ['dashboard', 'historical-rates', rateFrom, historyTo, hasHistoricalUsd, historicalFixed.length > 0],
    queryFn: async () => {
      const [usd, macro] = await Promise.all([
        hasHistoricalUsd ? historicalRatesService.usd(rateFrom, historyTo) : Promise.resolve([]),
        historicalFixed.length ? historicalRatesService.macro(rateFrom, historyTo) : Promise.resolve([]),
      ])
      return { usd, macro }
    },
    enabled: Boolean(userId) && Boolean(historyFrom) && rateFrom <= historyTo && positionsQuery.isSuccess && transactionsQuery.isSuccess && historicalAssets.isSuccess && fiHistory.isSuccess,
    staleTime: 60 * 60 * 1000,
  })

  // ── Proventos 12M ─────────────────────────────────────────────────────────

  // Sempre busca os últimos 12 meses completos — independente de earliestDate,
  // que pode ser recente (set/26), enquanto dividendos podem ter sido pagos
  // em dez/25 para ativos que o usuário tinha antes de cadastrar no Valora.

  const dividendsQuery = useDividends('1A', 'paid', walletId)

  // ── Patrimônio atual ──────────────────────────────────────────────────────
  // Mesma consulta e cálculo do seletor. Histórico fica restrito ao gráfico.
  const totalPatrimonioBRL = useMemo(() => {
    if (walletId === '' || current.isLoading || current.isError) return null
    if (walletId !== undefined) return current.totals.get(walletId) ?? (current.totals.has(walletId) ? null : 0)
    const values = [...current.totals.values()]
    return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  }, [walletId, current.totals, current.isLoading, current.isError])
  // ── Valor investido ───────────────────────────────────────────────────────
  const valorInvestidoBRL = useMemo(() => {
    const usdRate = current.usdRate
    let total = 0

    for (const pos of positions) {
      const currency = pos.asset?.currency ?? 'BRL'
      if (currency === 'USD' && usdRate === null) return null
      const rate = currency === 'USD' ? usdRate! : 1
      total += Number(pos.average_price) * Number(pos.quantity) * rate
    }

    total += fiPrincipalBRL

    return Number.isFinite(total) && total > 0 ? total : null
  }, [positions, current.usdRate, fiPrincipalBRL])

  // ── Ganho de capital ──────────────────────────────────────────────────────
  const ganhoCapitalBRL = useMemo(() => {
    if (totalPatrimonioBRL === null || valorInvestidoBRL === null) return null
    return totalPatrimonioBRL - valorInvestidoBRL
  }, [totalPatrimonioBRL, valorInvestidoBRL])

  // ── Proventos 12M ─────────────────────────────────────────────────────────
  const proventos12mBRL = useMemo(() => {
    const total = dividendsQuery.rows.reduce((acc, row) => acc + row.total_value, 0)
    return total > 0 ? total : null
  }, [dividendsQuery.rows])

  // ── Lucro total = ganho de capital + proventos ────────────────────────────
  const lucroTotalBRL = useMemo(() => {
    if (ganhoCapitalBRL === null && proventos12mBRL === null) return null
    return (ganhoCapitalBRL ?? 0) + (proventos12mBRL ?? 0)
  }, [ganhoCapitalBRL, proventos12mBRL])

  // ── Variação % 12M ───────────────────────────────────────────────────────
  // Mesma série e fórmula usadas por Desempenho em cada período.
  const variacaoPct = annualHistory.returnPct === null ? null : annualHistory.returnPct * 100
  const rentabilidadeTotalPct = performanceHistory.returnPct === null ? null : performanceHistory.returnPct * 100

  const monthlySeries = useMemo(() => {
    const type = chartFilters?.type ?? 'all'
    const chartPositions = positions.filter((position) => type === 'all' || position.asset?.type === type)
    const chartFixed = type === 'all' || type === 'fixed_income' ? historicalFixed : []
    const assets = new Map((historicalAssets.data ?? []).filter((asset) => asset !== null).map((asset) => [asset.ticker, asset]))
    const trades = (transactionsQuery.data ?? []).filter((trade) => type === 'all' || assets.get(trade.ticker)?.type === type).map((trade) => ({ ...trade, currency: assets.get(trade.ticker)?.currency ?? null }))
    const prices = [...(wealth.priceRows ?? []), ...(historicalPrices.data ?? [])].filter((price) => !chartFilters?.to || price.date <= chartFilters.to)
    const monthly = buildMonthlyWealth(chartPositions, prices, chartFixed, current.usdRate, historyTo, trades, historicalRates.data ?? { usd: [], macro: [] })
    // O mês em andamento acompanha o mesmo patrimônio atualizado do resumo.
    // O histórico pode terminar antes da última cotação ou conter dias parciais.
    const currentMonth = new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().slice(0, 10)
    const includeCurrent = (!chartFilters?.from || chartFilters.from <= today) && (!chartFilters?.to || chartFilters.to >= today)
    const ids = new Set(chartPositions.map((position) => position.id))
    const chartRows = current.rows.filter((row) => ids.has(row.id))
    const rateMissing = chartPositions.some((position) => position.asset?.currency === 'USD') && current.usdRate === null
    const filteredTotal = current.isLoading || current.isError || chartRows.some((row) => row.marketValueBRL === null) || rateMissing
      ? null
      : chartRows.reduce((sum, row) => sum + (row.marketValueBRL ?? 0), 0) + fi.rows.filter(() => type === 'all' || type === 'fixed_income').reduce((sum, row) => sum + (row.currentValue ?? row.principal), 0)
    const chartTotal = type === 'all' ? totalPatrimonioBRL : filteredTotal
    const chartInvested = type === 'all' ? valorInvestidoBRL : rateMissing ? null : chartPositions.reduce((sum, position) => sum + Number(position.quantity) * Number(position.average_price) * (position.asset?.currency === 'USD' ? current.usdRate! : 1), 0) + chartFixed.reduce((sum, row) => sum + fixedIncomePrincipalAt(row, today), 0)
    if (includeCurrent && chartTotal !== null && chartTotal > 0) {
      const currentPoint = monthly.find((point) => point.month === currentMonth)
      if (currentPoint) {
        currentPoint.totalBRL = chartTotal
        currentPoint.investedBRL = chartInvested
      } else monthly.push({ month: currentMonth, totalBRL: chartTotal, investedBRL: chartInvested })
    }
    if (monthly.length === 0) return []

    return monthly.filter((point) => (!chartFilters?.from || point.month >= chartFilters.from.slice(0, 7)) && (!chartFilters?.to || point.month <= chartFilters.to.slice(0, 7))).map((point) => ({
      ...point,
      investedBRL: point.totalBRL !== null && point.investedBRL !== null
        ? Math.min(point.investedBRL, point.totalBRL)
        : point.investedBRL,
    }))
  }, [positions, wealth.priceRows, transactionsQuery.data, historicalAssets.data, historicalPrices.data, historicalRates.data, historyTo, historicalFixed, fi.rows, current.rows, current.usdRate, current.isLoading, current.isError, valorInvestidoBRL, totalPatrimonioBRL, chartFilters?.from, chartFilters?.to, chartFilters?.type])

  // ── Composição para pizza ─────────────────────────────────────────────────
  // Usa as mesmas posições e cotações do patrimônio atual.
  const compositionSlices = useMemo(() => {
    const ids = new Set(current.positions.filter((position) => walletId === undefined || position.wallet_id === walletId).map((position) => position.id))
    const rows = current.rows.filter((row) => ids.has(row.id))
    const total = rows.reduce((sum, row) => sum + (row.marketValueBRL ?? 0), 0)
    return total > 0 ? deriveComposition(rows, total).slices : []
  }, [current.positions, current.rows, walletId])
  // ── Estado ────────────────────────────────────────────────────────────────
  const isLoading =
    performanceHistory.isLoading || annualHistory.isLoading ||
    fiHistory.isLoading ||
    historicalRates.isLoading ||
    transactionsQuery.isLoading || historicalAssets.isLoading || historicalPrices.isLoading ||
    current.isLoading ||
    wealth.isLoading ||
    positionsQuery.isLoading ||
    dividendsQuery.isLoading ||
    fi.isLoading

  const isError =
    performanceHistory.isError || annualHistory.isError ||
    fiHistory.isError ||
    historicalRates.isError ||
    transactionsQuery.isError || historicalAssets.isError || historicalPrices.isError ||
    current.isError ||
    wealth.isError ||
    positionsQuery.isError ||
    dividendsQuery.isError ||
    fi.isError

  const refetch = () => {
    performanceHistory.refetch()
    annualHistory.refetch()
    void fiHistory.refetch()
    void historicalRates.refetch()
    void transactionsQuery.refetch()
    void historicalAssets.refetch()
    void historicalPrices.refetch()
    current.refetch()
    wealth.refetch()
    void positionsQuery.refetch()
    void dividendsQuery.refetch()
  }

  return {
    historyIssues: [...new Set([...(performanceHistory.issues ?? []), ...(annualHistory.issues ?? [])])],
    historyIncomplete: performanceHistory.incomplete || annualHistory.incomplete,
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
