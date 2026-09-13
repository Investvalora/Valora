import { useQuery } from '@tanstack/react-query'
import { wealthService } from '../../wealth/services/wealthService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import type { WealthPeriod } from '../../wealth/types'
import type { PricePoint } from '../types'

const STALE_TIME_MS = 5 * 60 * 1000

/** Converte o período selecionado para a data de início da série. */
function periodToSince(period: WealthPeriod): string {
  const today = new Date()
  if (period === '1M') return shiftIsoDate(-30, today)
  if (period === '3M') return shiftIsoDate(-90, today)
  if (period === '6M') return shiftIsoDate(-183, today)
  if (period === '1A') return shiftIsoDate(-365, today)
  return '1970-01-01' // 'Tudo'
}

export function priceHistoryQueryKey(ticker: string, period: WealthPeriod) {
  return ['assets', 'price-history', ticker.toUpperCase(), period] as const
}

/**
 * Histórico de preços de um único ativo para o período selecionado.
 * Reutiliza `wealthService.listPriceHistory` sem modificação.
 */
export function usePriceHistory(ticker: string, period: WealthPeriod) {
  const normalizedTicker = ticker.toUpperCase()
  const since = periodToSince(period)

  return useQuery<PricePoint[]>({
    queryKey: priceHistoryQueryKey(normalizedTicker, period),
    queryFn: async () => {
      const rows = await wealthService.listPriceHistory([normalizedTicker], since)
      // Mapear PriceHistoryRow → PricePoint (close pode ser null quando não há pregão)
      return rows
        .filter((r) => r.ticker === normalizedTicker)
        .map((r) => ({ date: r.date, close: r.close ?? null }))
    },
    enabled: Boolean(normalizedTicker),
    staleTime: STALE_TIME_MS,
  })
}
