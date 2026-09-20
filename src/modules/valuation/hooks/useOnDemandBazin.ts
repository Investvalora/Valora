import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { positionService } from '../../portfolio/services/positionService'
import { quotesQueryKey } from '../../portfolio/hooks/useLatestQuotes'
import { insightService } from '../services/insightService'
import { calcBazinCeiling, calcMargin } from '../utils/bazinCalculation'
import type { AssetCurrency } from '../../portfolio/types'
import type { BazinResult, YahooDividendsResponse } from '../types'

export type OnDemandBazinStatus =
  | 'idle'
  | 'fetching-dividends'
  | 'fetching-quote'
  | 'done'
  | 'error'

export interface OnDemandBazinState {
  status: OnDemandBazinStatus
  result: BazinResult | null
  yahooData: YahooDividendsResponse | null
  error: string | null
}

/**
 * Calcula Bazin on-demand para qualquer ticker (não precisa estar na carteira).
 *
 * Fluxo:
 * 1. Chama a Edge Function `fetch-dividends-yahoo` para obter dividendos 12M.
 * 2. Busca a cotação mais recente via `positionService.listLatestQuotes`.
 * 3. Calcula preço-teto e margem com as funções puras existentes.
 * 4. Retorna `BazinResult` sem persistir nada.
 *
 * O hook reutiliza o cache de cotações via `queryClient.fetchQuery` com a mesma
 * query key de `useLatestQuotes` — se o usuário já tem o ativo na carteira,
 * não dispara nova request.
 */
export function useOnDemandBazin() {
  const queryClient = useQueryClient()
  const usdRateQuery = useUSDRate({ enabled: true })

  const [state, setState] = useState<OnDemandBazinState>({
    status: 'idle',
    result: null,
    yahooData: null,
    error: null,
  })

  async function calculate(
    ticker: string,
    currency: AssetCurrency,
    minDY: number,
  ): Promise<BazinResult | null> {
    setState({ status: 'fetching-dividends', result: null, yahooData: null, error: null })

    try {
      // 1. Dividendos via Yahoo Finance (Edge Function)
      const yahooData = await insightService.fetchYahooDividends(ticker, currency)

      setState((s) => ({ ...s, status: 'fetching-quote', yahooData }))

      // 2. Cotação mais recente — reutiliza cache quando disponível
      const normalized = ticker.trim().toUpperCase()
      const quotes = await queryClient.fetchQuery({
        queryKey: quotesQueryKey([normalized]),
        queryFn: () => positionService.listLatestQuotes([normalized]),
        staleTime: 60 * 1000,
      })

      // 3. Cálculo
      const usdRate =
        usdRateQuery.data?.rate && Number.isFinite(usdRateQuery.data.rate)
          ? usdRateQuery.data.rate
          : USD_RATE_DEFAULT

      const fx = currency === 'USD' ? usdRate : 1
      const annualDividend = yahooData.annualDividend * fx

      const rawPrice = quotes[0] ? Number(quotes[0].close) : null
      const currentPrice = rawPrice !== null && Number.isFinite(rawPrice) && rawPrice > 0
        ? rawPrice * fx
        : null

      const ceilingPrice = calcBazinCeiling(annualDividend, minDY)
      const margin = calcMargin(ceilingPrice, currentPrice)

      const result: BazinResult = {
        ticker,
        currency,
        annualDividend,
        ceilingPrice,
        currentPrice,
        margin,
        hasData: annualDividend > 0,
      }

      setState({ status: 'done', result, yahooData, error: null })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      setState({ status: 'error', result: null, yahooData: null, error: msg })
      return null
    }
  }

  function reset() {
    setState({ status: 'idle', result: null, yahooData: null, error: null })
  }

  return { ...state, calculate, reset }
}
