import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { dividendService } from '../../dividends/services/dividendService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'

const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Calcula o total de proventos recebidos nos últimos 12 meses por ticker.
 *
 * Retorna um Map de `ticker → totalBRL` onde:
 * - `totalBRL = Σ (value_per_share × quantity)` para todas as linhas do ticker
 *
 * Depende das quantidades atuais das posições — não rastreia quantidades
 * históricas (simplificação aceitável para a tabela de carteira).
 */
export function useDividendTotals(
  tickers: string[],
  quantityByTicker: Map<string, number>,
): Map<string, number> {
  const { user } = useAuth()
  const userId = user?.id

  const since = useMemo(() => shiftIsoDate(-365), [])

  const sortedTickers = useMemo(() => [...tickers].sort(), [tickers])

  const { data: rawRows = [] } = useQuery({
    queryKey: ['portfolio', 'dividend-totals', userId, sortedTickers],
    queryFn: () => dividendService.listDividendsByTickers(sortedTickers, since),
    enabled: Boolean(userId) && sortedTickers.length > 0,
    staleTime: STALE_TIME_MS,
  })

  return useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of rawRows) {
      const qty = quantityByTicker.get(row.ticker) ?? 0
      if (qty <= 0) continue
      const prev = totals.get(row.ticker) ?? 0
      totals.set(row.ticker, prev + Number(row.value_per_share) * qty)
    }
    return totals
  }, [rawRows, quantityByTicker])
}
