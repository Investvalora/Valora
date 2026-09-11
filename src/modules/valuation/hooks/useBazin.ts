import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { dividendService } from '../../dividends/services/dividendService'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { applyBazin } from '../utils/bazinCalculation'
import type { BazinByTicker } from '../types'

/** staleTime de 5 minutos — dividendos mudam com pouca frequência (seed trimestral). */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Query key dos dividendos para o cálculo Bazin.
 * Inclui os tickers para que carteiras distintas nunca compartilhem a mesma entrada.
 */
export function bazinDividendsQueryKey(userId: string | undefined, tickers: string[]) {
  return ['valuation', 'bazin-dividends', userId, [...tickers].sort()] as const
}

export interface UseBazinResult {
  bazinByTicker: BazinByTicker
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Hook de orquestração do cálculo Bazin.
 *
 * Combina:
 * 1. Dividendos dos últimos 12 meses (query ao banco)
 * 2. Cotações mais recentes via `useLatestQuotes` (reutilizado sem modificação)
 * 3. Cálculo síncrono via `useMemo` — sem chamada ao banco, sem persistência (AD-5/AD-9)
 *
 * @param tickers  Lista de tickers da carteira do usuário.
 * @param minDY    DY mínimo em decimal (ex: 0.06 para 6%).
 */
export function useBazin(tickers: string[], minDY: number): UseBazinResult {
  const { user } = useAuth()
  const userId = user?.id

  // Sempre 12 meses fixos — independente de seletor de período.
  const since = shiftIsoDate(-365, new Date())

  // Query 1: dividendos dos últimos 12 meses para os tickers da carteira.
  const dividendsQuery = useQuery({
    queryKey: bazinDividendsQueryKey(userId, tickers),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return dividendService.listDividendsByTickers(tickers, since)
    },
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: STALE_TIME_MS,
  })

  // Query 2: cotações mais recentes (staleTime 60s, sem userId na key).
  const quotesQuery = useLatestQuotes(tickers)

  const dividends = useMemo(() => dividendsQuery.data ?? [], [dividendsQuery.data])
  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data])

  // Cálculo síncrono — recalcula apenas quando dados ou DY mínimo mudam.
  const bazinByTicker = useMemo(
    () => applyBazin(tickers, dividends, quotes, minDY),
    // tickers.join é instável para tickers com vírgula; JSON.stringify com sort garante key única e estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify([...tickers].sort()), dividends, quotes, minDY],
  )

  const isLoading = dividendsQuery.isLoading || quotesQuery.isLoading
  const isError = dividendsQuery.isError || quotesQuery.isError

  const refetch = () => {
    void dividendsQuery.refetch()
    void quotesQuery.refetch()
  }

  return { bazinByTicker, isLoading, isError, refetch }
}
