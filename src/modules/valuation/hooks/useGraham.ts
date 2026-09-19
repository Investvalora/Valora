import { useMemo } from 'react'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { applyGraham, sortGrahamResults } from '../utils/bazinCalculation'
import type { AssetCurrency } from '../../portfolio/types'
import type { GrahamByTicker, GrahamResult } from '../types'

export interface UseGrahamResult {
  grahamByTicker: GrahamByTicker
  sortedResults: GrahamResult[]
  isLoading: boolean
  isError: boolean
  /** `true` quando a taxa USD/BRL não veio de uma fonte ao vivo. */
  isUSDRateFallback: boolean
  refetch: () => void
}

/**
 * Hook de orquestração do cálculo Graham.
 *
 * Combina:
 * 1. Fundamentals (LPA, VPA) via `useFundamentals`
 * 2. Cotações mais recentes via `useLatestQuotes`
 * 3. Taxa USD/BRL via `useUSDRate` — converte preço justo e cotação de
 *    ativos USD para BRL antes da comparação.
 * 4. Cálculo síncrono via `useMemo`
 *
 * @param tickers           Lista de tickers da carteira do usuário.
 * @param currencyByTicker  Map ticker → 'BRL'|'USD', derivado das posições.
 */
export function useGraham(
  tickers: string[],
  currencyByTicker: Map<string, AssetCurrency>,
): UseGrahamResult {
  const hasUSD = useMemo(
    () => [...currencyByTicker.values()].some((c) => c === 'USD'),
    [currencyByTicker],
  )

  const fundamentalsQuery = useFundamentals(tickers)
  const quotesQuery = useLatestQuotes(tickers)
  const usdRateQuery = useUSDRate({ enabled: hasUSD })

  const fundamentals = useMemo(() => fundamentalsQuery.data ?? [], [fundamentalsQuery.data])
  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data])
  const usdRate = usdRateQuery.data?.rate ?? USD_RATE_DEFAULT
  const isUSDRateFallback = usdRateQuery.data?.isFallback ?? true

  const currencyKey = useMemo(
    () => JSON.stringify([...currencyByTicker.entries()].sort()),
    [currencyByTicker],
  )

  const grahamByTicker = useMemo(
    () => applyGraham(tickers, fundamentals, quotes, currencyByTicker, usdRate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify([...tickers].sort()), fundamentals, quotes, currencyKey, usdRate],
  )

  const sortedResults = useMemo(
    () => sortGrahamResults(Array.from(grahamByTicker.values())),
    [grahamByTicker],
  )

  const isLoading =
    fundamentalsQuery.isLoading ||
    quotesQuery.isLoading ||
    (hasUSD && usdRateQuery.isLoading)

  const isError = fundamentalsQuery.isError || quotesQuery.isError

  const refetch = () => {
    void fundamentalsQuery.refetch()
    void quotesQuery.refetch()
    if (hasUSD) void usdRateQuery.refetch()
  }

  return { grahamByTicker, sortedResults, isLoading, isError, isUSDRateFallback, refetch }
}
