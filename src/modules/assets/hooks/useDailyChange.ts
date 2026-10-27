import { useQuery } from '@tanstack/react-query'
import { positionService } from '../../portfolio/services/positionService'
import type { LatestQuote } from '../../portfolio/types'

export function useDailyChange(quote: LatestQuote | null) {
  const previous = useQuery({
    queryKey: ['assets', 'previous-close', quote?.ticker, quote?.date],
    queryFn: () => positionService.previousClose(quote!.ticker, quote!.date),
    enabled: Boolean(quote?.ticker && quote?.date),
    staleTime: 60_000,
  })
  if (previous.isError || previous.isLoading || previous.data == null || !quote || !Number.isFinite(Number(quote.close))) return null
  return (Number(quote.close) / previous.data - 1) * 100
}
