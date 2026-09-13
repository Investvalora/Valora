import { useQuery } from '@tanstack/react-query'
import { dividendService } from '../../dividends/services/dividendService'
import type { DividendRaw } from '../../dividends/types'

/** staleTime de 5 minutos — dividendos mudam com baixa frequência (seed trimestral). */
const STALE_TIME_MS = 5 * 60 * 1000

export function assetDividendsQueryKey(ticker: string) {
  return ['assets', 'dividends', ticker.toUpperCase()] as const
}

/**
 * Histórico completo de dividendos de um único ativo.
 * Usa `since = '1970-01-01'` para capturar todo o histórico disponível.
 * Limitado a 500 registros (DIVIDENDS_LIMIT) — documentado como limitação do MVP.
 */
export function useAssetDividends(ticker: string) {
  const normalizedTicker = ticker.toUpperCase()

  return useQuery<DividendRaw[]>({
    queryKey: assetDividendsQueryKey(normalizedTicker),
    queryFn: () => dividendService.listDividendsByTickers([normalizedTicker], '1970-01-01'),
    enabled: Boolean(normalizedTicker),
    staleTime: STALE_TIME_MS,
  })
}
