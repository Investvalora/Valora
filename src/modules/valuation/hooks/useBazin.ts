import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { insightService } from '../services/insightService'
import { marketDividendRows } from '../utils/marketDividendRows'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { applyBazin } from '../utils/bazinCalculation'
import type { AssetCurrency } from '../../portfolio/types'
import type { BazinByTicker } from '../types'

/** Cache de uma hora para o histórico de mercado por ativo. */
const STALE_TIME_MS = 60 * 60 * 1000

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
 * 1. Eventos de dividendos dos últimos 12 meses na fonte de mercado
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
  const historyQueries = useQueries({
    queries: [...new Set(tickers)].filter((ticker) => !/-(BRL|USD|USDT)$/.test(ticker)).map((ticker) => ({
      queryKey: ['valuation', 'market-dividends-12m', userId, ticker, currencyByTicker.get(ticker) ?? 'BRL', since],
      queryFn: async () => {
        const response = await insightService.fetchYahooDividends(ticker, currencyByTicker.get(ticker) ?? 'BRL')
        return marketDividendRows(ticker, response, since, new Date().toISOString().slice(0, 10))
      },
      enabled: Boolean(userId),
      staleTime: STALE_TIME_MS,
      retry: 1,
      throwOnError: false,
    })),
  })

  // Query 2: cotações mais recentes (staleTime 60s, sem userId na key).
  const quotesQuery = useLatestQuotes(tickers)

  // Query 3: taxa USD/BRL — só busca quando há ativos USD na carteira.
  const usdRateQuery = useUSDRate({ enabled: hasUSD })

  const dividends = historyQueries.flatMap((query) => query.data ?? [])
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
    historyQueries.some((query) => query.isLoading) ||
    quotesQuery.isLoading ||
    (hasUSD && usdRateQuery.isLoading)

  const isError = historyQueries.some((query) => query.isError) || quotesQuery.isError

  const refetch = () => {
    historyQueries.forEach((query) => { void query.refetch() })
    void quotesQuery.refetch()
    if (hasUSD) void usdRateQuery.refetch()
  }

  return { bazinByTicker, isLoading, isError, isUSDRateFallback, refetch }
}
