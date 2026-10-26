import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useAllTransactions } from '../../portfolio/hooks/useTransactions'
import { useFixedIncomeHistory } from '../../portfolio/hooks/useFixedIncomeHistory'
import { useDividends } from '../../dividends/hooks/useDividends'
import { positionService } from '../../portfolio/services/positionService'
import { wealthService } from '../../wealth/services/wealthService'
import { historicalRatesService } from '../../dashboard/services/historicalRatesService'
import { historicalReturns, summarizeHistoricalReturns } from '../utils/historicalReturns'
import { shiftIsoDate, toIsoDate } from '../../../shared/utils/isoDate'
import type { AssetType } from '../../portfolio/types'
import type { PerformancePeriod } from '../types'

export function useHistoricalReturns(period: PerformancePeriod, walletId?: string, assetType?: AssetType) {
  const { user } = useAuth()
  const positionsQuery = usePositions(walletId)
  const tradesQuery = useAllTransactions(walletId)
  const fixedQuery = useFixedIncomeHistory(walletId)
  const incomeQuery = useDividends('Tudo', 'paid', walletId)
  const today = toIsoDate(new Date())
  const trades = useMemo(() => tradesQuery.data ?? [], [tradesQuery.data])
  const positions = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data])
  const data = useQuery({
    queryKey: ['performance', 'historical-inputs', user?.id, walletId, tradesQuery.dataUpdatedAt, positionsQuery.dataUpdatedAt, fixedQuery.dataUpdatedAt, today],
    queryFn: async () => {
      const tickers = [...new Set([...positions.map(p => p.ticker), ...trades.map(t => t.ticker)])].sort()
      const assets = await Promise.all(tickers.map(t => positionService.findAssetByTicker(t)))
      const metadata = new Map(assets.filter(a => a !== null).map(a => [a.ticker, a]))
      for (const p of positions) if (p.asset) metadata.set(p.ticker, { ...p.asset, ticker: p.ticker })
      const first = [...trades.map(t => t.transaction_date), ...positions.map(p => p.acquisition_date), ...(fixedQuery.data?.positions ?? []).map(p => p.application_date)]
        .filter(d => d && d <= today).sort()[0]
      if (!first) return { prices: [], usd: [], macro: [], metadata }
      const from = shiftIsoDate(-10, new Date(`${first}T12:00:00Z`))
      const quoteTickers = [...new Set(tickers.flatMap(t => t.endsWith('-BRL') ? [t, t.slice(0, -4)] : [t]))]
      const needsUsd = assets.some(a => a?.currency === 'USD') || tickers.some(t => t.endsWith('-BRL'))
      const [prices, usd, macro] = await Promise.all([
        wealthService.listPriceHistory(quoteTickers, from),
        needsUsd ? historicalRatesService.usd(from, today) : Promise.resolve([]),
        (fixedQuery.data?.positions.length ?? 0) > 0 ? historicalRatesService.macro(from, today) : Promise.resolve([]),
      ])
      return { prices, usd, macro, metadata }
    },
    enabled: Boolean(user && walletId) && positionsQuery.isSuccess && tradesQuery.isSuccess && fixedQuery.isSuccess,
    staleTime: 300_000,
  })
  const points = useMemo(() => {
    if (!data.data) return []
    const { metadata, prices, usd, macro } = data.data
    const selectedTrades = trades.filter(t => !assetType || metadata.get(t.ticker)?.type === assetType)
      .map(t => ({ ...t, currency: metadata.get(t.ticker)?.currency ?? null }))
    const selectedPositions = positions.filter(p => !assetType || p.asset?.type === assetType)
    const fixed = !assetType || assetType === 'fixed_income' ? (fixedQuery.data?.positions ?? []).map(p => ({ ...p, events: (fixedQuery.data?.events ?? []).filter(e => e.position_id === p.id) })) : []
    const income = incomeQuery.rows.filter(p => !assetType || (p.asset_type ?? metadata.get(p.ticker)?.type) === assetType)
    return historicalReturns(selectedPositions, selectedTrades, prices, fixed, { usd, macro }, today, income)
  }, [data.data, trades, positions, fixedQuery.data, incomeQuery.rows, assetType, today])
  const since = period === 'Tudo' ? points[0]?.date ?? today
    : shiftIsoDate(-({ '1M': 30, '3M': 90, '6M': 180, '1A': 365 }[period]))
  const summary = useMemo(() => summarizeHistoricalReturns(points, since, today), [points, since, today])
  const isLoading = positionsQuery.isLoading || tradesQuery.isLoading || fixedQuery.isLoading || incomeQuery.isLoading || data.isLoading
  const isError = positionsQuery.isError || tradesQuery.isError || fixedQuery.isError || incomeQuery.isError || data.isError
  return { ...summary, points, since, isLoading, isError,
    returnPct: isLoading || isError ? null : summary.returnPct,
    incomplete: !isLoading && !isError && summary.incomplete,
    refetch: () => { void positionsQuery.refetch(); void tradesQuery.refetch(); void fixedQuery.refetch(); void incomeQuery.refetch(); void data.refetch() } }
}
