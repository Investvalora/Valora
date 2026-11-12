import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { shiftIsoDate, toIsoDate } from '../../../shared/utils/isoDate'
import { listPendingSecAnnouncements } from '../services/secAnnouncementsService'
import type { DividendPeriod } from '../types'

export function usePendingSecAnnouncements(period: DividendPeriod) {
  const { user } = useAuth()
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''
  const positions = usePositions(walletId)
  const tickers = [...new Set((positions.data ?? []).map(row => row.ticker))].sort()
  const today = toIsoDate(new Date())
  const until = period === 'Tudo' ? '9999-12-31' : shiftIsoDate(period === '6M' ? 183 : 365)
  const query = useQuery({
    queryKey: ['dividends', 'sec-pending', user?.id, walletId, tickers, today, until],
    queryFn: () => listPendingSecAnnouncements(tickers, today, until),
    enabled: Boolean(user && walletId) && positions.isSuccess,
    staleTime: 5 * 60 * 1000,
  })
  return { ...query, isLoading: positions.isLoading || query.isLoading,
    isError: positions.isError || query.isError,
    refetch: () => positions.isError ? positions.refetch() : query.refetch() }
}
