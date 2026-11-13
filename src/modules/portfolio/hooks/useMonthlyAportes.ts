import { useQuery } from '@tanstack/react-query'
import { historicalRatesService } from '../../dashboard/services/historicalRatesService'
import { positionService } from '../services/positionService'
import type { Transaction } from '../services/transactionsService'
import type { AssetType } from '../types'
import { buildMonthlyAportes, type AporteAsset } from '../monthlyAportes'

export function useMonthlyAportes(transactions: Transaction[], filter: AssetType | 'all') {
  const trades = transactions.filter(t => t.type === 'buy' || t.type === 'sell')
  const tickers = [...new Set(trades.map(t => t.ticker))].sort()
  const catalog = useQuery({
    queryKey: ['portfolio', 'transaction-assets', tickers],
    queryFn: () => positionService.listTransactionAssets(tickers),
    enabled: tickers.length > 0,
    staleTime: 5 * 60 * 1000,
  })
  const assets = new Map<string, AporteAsset>((catalog.data ?? []).map(a => [a.ticker, { type: a.type, currency: a.currency }]))
  const dates = trades.filter(t => assets.get(t.ticker)?.currency === 'USD' && (filter === 'all' || assets.get(t.ticker)?.type === filter)).map(t => t.transaction_date).sort()
  const from = dates.length ? new Date(Date.parse(`${dates[0]}T00:00:00Z`) - 10 * 86400000).toISOString().slice(0, 10) : ''
  const to = dates[dates.length - 1] ?? ''
  const rates = useQuery({
    queryKey: ['portfolio', 'aporte-rates', from, to],
    queryFn: () => historicalRatesService.usd(from, to),
    enabled: catalog.isSuccess && !!from,
    staleTime: 60 * 60 * 1000,
  })
  const loading = tickers.length > 0 && (catalog.isLoading || (!!from && rates.isLoading))
  const error = catalog.isError || (!!from && rates.isError)
  return {
    data: loading || error ? [] : buildMonthlyAportes(trades, assets, filter, rates.data ?? []),
    loading, error,
    refetch: () => { void catalog.refetch(); if (from) void rates.refetch() },
  }
}
