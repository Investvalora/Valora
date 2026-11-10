import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { historicalRatesService } from '../../dashboard/services/historicalRatesService'
import { transactionsService } from '../services/transactionsService'
import { acquisitionCostBRL } from '../acquisitionCost'
import type { PositionWithAsset } from '../types'

export function useAcquisitionCosts(positions: PositionWithAsset[], walletId?: string) {
  const { user } = useAuth()
  const usd = positions.filter(p => p.asset?.currency === 'USD')
  const needsHistory = usd.length > 0
  const needsLedger = positions.length > 0
  const trades = useQuery({
    queryKey: ['portfolio', 'transactions-all', user?.id, walletId],
    queryFn: () => transactionsService.listAll(user!.id, walletId),
    enabled: !!user && walletId !== '' && needsLedger,
    staleTime: 5 * 60 * 1000,
  })
  const dates = [...usd.map(p => p.acquisition_date), ...(trades.data ?? []).filter(t => t.type === 'buy' && usd.some(p => p.wallet_id === t.wallet_id && p.ticker === t.ticker)).map(t => t.transaction_date)].filter(Boolean).sort()
  const from = dates.length ? new Date(Date.parse(`${dates[0]}T00:00:00Z`) - 10 * 86400000).toISOString().slice(0, 10) : ''
  const to = dates[dates.length - 1] ?? ''
  const rates = useQuery({
    queryKey: ['portfolio', 'acquisition-rates', from, to],
    queryFn: () => historicalRatesService.usd(from, to),
    enabled: needsHistory && trades.isSuccess && !!from && !!to,
    staleTime: 60 * 60 * 1000,
  })
  const ready = !needsLedger || (trades.isSuccess && (!needsHistory || rates.isSuccess))
  const byPosition = new Map(positions.map(p => [p.id, !ready ? null : acquisitionCostBRL(p, trades.data ?? [], rates.data ?? [])]))
  const values = [...byPosition.values()]
  return {
    byPosition,
    total: values.some(v => v === null) ? null : values.reduce<number>((sum, v) => sum + (v ?? 0), 0),
    isLoading: needsLedger && (trades.isLoading || (needsHistory && !!from && rates.isLoading)),
    isError: needsLedger && (trades.isError || (needsHistory && rates.isError)),
    refetch: () => { void trades.refetch(); if (from) void rates.refetch() },
  }
}
