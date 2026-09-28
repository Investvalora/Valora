import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { INTERNATIONAL_TYPES } from '../composition'
import { fixedIncomeService } from '../services/fixedIncomeService'
import { positionService } from '../services/positionService'

// o valor de mercado por carteira para a tela de seleção
export function useWalletTotals() {
  const { user } = useAuth()
  const userId = user?.id

  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions', userId, 'all-wallets'],
    queryFn: () => positionService.listAllPositions(userId!),
    enabled: Boolean(userId),
  })

  const fixedIncomeQuery = useQuery({
    queryKey: ['portfolio', 'fixed-income', userId, 'all-wallets'],
    queryFn: () => fixedIncomeService.listPositions(userId!),
    enabled: Boolean(userId),
  })

  const positions = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data],
  )
  const tickers = useMemo(
    () => [...new Set(positions.map((position) => position.ticker))].sort(),
    [positions],
  )

  const quotesQuery = useQuery({
    queryKey: ['portfolio', 'wallet-quotes', tickers],
    queryFn: () => positionService.listLatestQuotes(tickers),
    enabled: tickers.length > 0,
  })

  const needsUsd = positions.some((position) => {
    const asset = position.asset
    return asset?.currency === 'USD' &&
      asset.type !== null &&
      INTERNATIONAL_TYPES.includes(asset.type)
  })
  const usdQuery = useUSDRate({ enabled: needsUsd })

  const totals = useMemo(() => {
    const result = new Map<string, number | null>()
    const quotes = new Map(
      (quotesQuery.data ?? []).map((quote) => [quote.ticker, Number(quote.close)]),
    )
    const usdRate = usdQuery.data?.rate || 5

    for (const position of positions) {
      if (!position.wallet_id) continue
      const close = quotes.get(position.ticker)
      if (close === undefined || !Number.isFinite(close)) {
        result.set(position.wallet_id, null)
        continue
      }

      const asset = position.asset
      const needsConversion = asset?.currency === 'USD' &&
        asset.type !== null &&
        INTERNATIONAL_TYPES.includes(asset.type)
      const value = close * Number(position.quantity) * (needsConversion ? usdRate : 1)
      if (result.get(position.wallet_id) !== null) {
        result.set(position.wallet_id, (result.get(position.wallet_id) ?? 0) + value)
      }
    }

    for (const position of fixedIncomeQuery.data ?? []) {
      if (!position.wallet_id) continue
      const value = Number(position.current_value ?? position.principal)
      if (result.get(position.wallet_id) !== null) {
        result.set(position.wallet_id, (result.get(position.wallet_id) ?? 0) + value)
      }
    }

    return result
  }, [positions, fixedIncomeQuery.data, quotesQuery.data, usdQuery.data?.rate])

  return {
    totals,
    isLoading:
      positionsQuery.isLoading ||
      fixedIncomeQuery.isLoading ||
      quotesQuery.isLoading ||
      (needsUsd && usdQuery.isLoading),
    isError: positionsQuery.isError || fixedIncomeQuery.isError || quotesQuery.isError,
  }
}
