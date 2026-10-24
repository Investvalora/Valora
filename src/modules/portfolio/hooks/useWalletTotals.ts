import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { derivePositionRows } from '../positionRows'
import { useLatestQuotes } from './useLatestQuotes'
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

  const quotesQuery = useLatestQuotes(tickers)
  const needsUsd = positions.some((position) => position.asset?.currency === 'USD')
  const usdQuery = useUSDRate({ enabled: needsUsd })
  const derived = useMemo(() => derivePositionRows({
    positions,
    quotes: quotesQuery.data ?? [],
    usdRate: usdQuery.data?.rate ?? null,
  }), [positions, quotesQuery.data, usdQuery.data?.rate])
  const totals = useMemo(() => {
    const result = new Map<string, number | null>()
    for (let i = 0; i < positions.length; i++) {
      const walletId = positions[i].wallet_id
      if (!walletId) continue
      const value = derived.rows[i].marketValueBRL
      if (value === null || result.get(walletId) === null) {
        result.set(walletId, null)
      } else {
        result.set(walletId, (result.get(walletId) ?? 0) + value)
      }
    }
    for (const position of fixedIncomeQuery.data ?? []) {
      if (!position.wallet_id) continue
      const value = Number(position.current_value ?? position.principal)
      if (!Number.isFinite(value)) {
        result.set(position.wallet_id, null)
      } else if (result.get(position.wallet_id) !== null) {
        result.set(position.wallet_id, (result.get(position.wallet_id) ?? 0) + value)
      }
    }

    return result
  }, [positions, fixedIncomeQuery.data, derived.rows])

  return {
    totals,
    positions,
    rows: derived.rows,
    usdRate: usdQuery.data?.rate ?? null,
    refetch: () => { void positionsQuery.refetch(); void fixedIncomeQuery.refetch(); void quotesQuery.refetch(); void usdQuery.refetch() },
    isLoading:
      positionsQuery.isLoading ||
      fixedIncomeQuery.isLoading ||
      quotesQuery.isLoading ||
      (needsUsd && usdQuery.isLoading),
    isError: positionsQuery.isError || fixedIncomeQuery.isError || quotesQuery.isError || (needsUsd && usdQuery.isError),
  }
}
