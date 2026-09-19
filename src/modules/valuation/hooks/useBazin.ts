import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { dividendService } from '../../dividends/services/dividendService'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { applyBazin } from '../utils/bazinCalculation'
import type { AssetCurrency } from '../../portfolio/types'
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
  /** `true` quando a taxa USD/BRL não veio de uma fonte ao vivo (cache ou default). */
  isUSDRateFallback: boolean
  refetch: () => void
}

/**
 * Hook de orquestração do cálculo Bazin.
 *
 * Combina:
 * 1. Dividendos dos últimos 12 meses (query ao banco)
 * 2. Cotações mais recentes via `useLatestQuotes`
 * 3. Taxa USD/BRL via `useUSDRate` — necessária para converter dividendos e
 *    cotações de ativos USD (NVDA, AMZN, GOOGL, AAPL, META etc.) para BRL.
 * 4. Cálculo síncrono via `useMemo` — sem chamada ao banco, sem persistência
 *
 * @param tickers           Lista de tickers da carteira do usuário.
 * @param minDY             DY mínimo em decimal (ex: 0.06 para 6%).
 * @param currencyByTicker  Map ticker → 'BRL'|'USD', derivado das posições.
 */
export function useBazin(
  tickers: string[],
  minDY: number,
  currencyByTicker: Map<string, AssetCurrency>,
): UseBazinResult {
  const { user } = useAuth()
  const userId = user?.id

  const hasUSD = useMemo(
    () => [...currencyByTicker.values()].some((c) => c === 'USD'),
    [currencyByTicker],
  )

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

  // Query 3: taxa USD/BRL — só busca quando há ativos USD na carteira.
  const usdRateQuery = useUSDRate({ enabled: hasUSD })

  const dividends = useMemo(() => dividendsQuery.data ?? [], [dividendsQuery.data])
  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data])
  const usdRate = usdRateQuery.data?.rate ?? USD_RATE_DEFAULT
  const isUSDRateFallback = usdRateQuery.data?.isFallback ?? true

  // Chave estável para o mapa de moedas (evita recálculo desnecessário).
  const currencyKey = useMemo(
    () => JSON.stringify([...currencyByTicker.entries()].sort()),
    [currencyByTicker],
  )

  // Cálculo síncrono — recalcula apenas quando dados, DY mínimo ou câmbio mudam.
  const bazinByTicker = useMemo(
    () => applyBazin(tickers, dividends, quotes, minDY, currencyByTicker, usdRate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify([...tickers].sort()), dividends, quotes, minDY, currencyKey, usdRate],
  )

  const isLoading =
    dividendsQuery.isLoading ||
    quotesQuery.isLoading ||
    (hasUSD && usdRateQuery.isLoading)

  const isError = dividendsQuery.isError || quotesQuery.isError

  const refetch = () => {
    void dividendsQuery.refetch()
    void quotesQuery.refetch()
    if (hasUSD) void usdRateQuery.refetch()
  }

  return { bazinByTicker, isLoading, isError, isUSDRateFallback, refetch }
}
