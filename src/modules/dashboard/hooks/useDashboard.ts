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
import { dividendService } from '../../dividends/services/dividendService'
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

export interface WealthChartFilters {
  from?: string
  to?: string
  type?: AssetType | 'all'
}

export function useDashboard(walletId?: string, chartFilters?: WealthChartFilters): DashboardData {
  const { user } = useAuth()
  const userId = user?.id

  // ── Série histórica de renda variável ────────────────────────────────────
  // Período "Tudo" (365 dias) — mostra o máximo de histórico disponível
  const current = useWalletTotals()
  const wealth = useWealthHistory('Tudo', walletId, chartFilters?.from)
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
      return first ? wealthService.listPriceHistory([...new Set(trades.map((row) => row.ticker))], first) : Promise.resolve([])
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
  const hasHistoricalUsd = positions.some((row) => row.asset?.currency === 'USD') || (historicalAssets.data ?? []).some((asset) => asset?.currency === 'USD')
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
  const tickers = useMemo(() => positions.map((p) => p.ticker).sort(), [positions])

  // Sempre busca os últimos 12 meses completos — independente de earliestDate,
  // que pode ser recente (set/26), enquanto dividendos podem ter sido pagos
  // em dez/25 para ativos que o usuário tinha antes de cadastrar no Valora.
  const sinceProventos = useMemo(() => shiftIsoDate(-365), [])

  const dividendsQuery = useQuery({
    queryKey: ['dashboard', 'dividends-12m', userId, walletId, tickers],
    queryFn: () => dividendService.listDividendsByTickers(tickers, sinceProventos),
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: STALE_TIME_MS,
  })

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
  // Cada mês usa o fechamento disponível por ativo e o custo das posições
  // já adquiridas; não compara patrimônio parcial com o custo atual completo.
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
    fiHistory.isLoading ||
    historicalRates.isLoading ||
    transactionsQuery.isLoading || historicalAssets.isLoading || historicalPrices.isLoading ||
    current.isLoading ||
    wealth.isLoading ||
    positionsQuery.isLoading ||
    dividendsQuery.isLoading ||
    fi.isLoading

  const isError =
    fiHistory.isError ||
    historicalRates.isError ||
    transactionsQuery.isError || historicalAssets.isError || historicalPrices.isError ||
    current.isError ||
    wealth.isError ||
    positionsQuery.isError ||
    dividendsQuery.isError ||
    fi.isError

  const refetch = () => {
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
