import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  transactionsService,
  type NewManualTransaction,
} from '../services/transactionsService'
import { positionService } from '../services/positionService'
import { positionsQueryKey } from './usePositions'

const STALE_TIME_MS = 5 * 60 * 1000

export function transactionsByTickerQueryKey(userId: string | undefined, ticker: string) {
  return ['portfolio', 'transactions', userId, ticker.toUpperCase()] as const
}

/** Lista de transações de um ticker do usuário. */
export function useTransactionsByTicker(ticker: string) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: transactionsByTickerQueryKey(userId, ticker),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.listByTicker(userId, ticker)
    },
    enabled: Boolean(userId) && Boolean(ticker),
    staleTime: STALE_TIME_MS,
  })
}

/**
 * Insere uma transação manual (buy/sell).
 * Após sucesso invalida transações do ticker e posições (o trigger
 * recalculate_position atualiza positions no banco).
 */
export function useAddTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (payload: NewManualTransaction) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.addManualTransaction(userId, payload)
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: transactionsByTickerQueryKey(userId, payload.ticker),
      })
      // O trigger de banco recalculate_position atualiza positions:
      // invalida a query para refletir o novo preço médio / quantidade.
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
    },
  })
}

/**
 * Remove uma transação.
 * Após sucesso invalida transações do ticker e posições.
 */
export function useDeleteTransaction(ticker: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.deleteTransaction(userId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionsByTickerQueryKey(userId, ticker),
      })
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
    },
  })
}

/** Remove a posição inteira (não as transações — a posição em si). */
export function useDeletePosition() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (positionId: string) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return positionService.deletePosition(userId, positionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
    },
  })
}

export function allTransactionsQueryKey(userId: string | undefined) {
  return ['portfolio', 'transactions-all', userId] as const
}

/** Lista todas as transações do usuário (todos os tickers). */
export function useAllTransactions() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: allTransactionsQueryKey(userId),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.listAll(userId)
    },
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })
}

// ─── Utilitários de agrupamento para o gráfico ────────────────────────────────

import type { Transaction } from '../services/transactionsService'
import type { AssetType } from '../types'

export interface MonthlyAportePoint {
  month: string   // YYYY-MM
  compras: number // soma de quantity × price de buy
  vendas: number  // soma de quantity × price de sell (valor positivo)
}

/**
 * Agrega transações buy/sell por mês para o gráfico de consolidação.
 * Filtra por tipo de ativo se `assetTypeFilter` for informado.
 */
export function buildMonthlyAportes(
  transactions: Transaction[],
  assetTypeMap: Map<string, AssetType | null>,
  assetTypeFilter: AssetType | 'all' = 'all',
): MonthlyAportePoint[] {
  const map = new Map<string, MonthlyAportePoint>()

  for (const txn of transactions) {
    if (txn.type !== 'buy' && txn.type !== 'sell') continue

    if (assetTypeFilter !== 'all') {
      const assetType = assetTypeMap.get(txn.ticker)
      if (assetType !== assetTypeFilter) continue
    }

    const month = txn.transaction_date.slice(0, 7)
    const value = Number(txn.quantity) * Number(txn.price)
    if (!Number.isFinite(value)) continue

    const existing = map.get(month) ?? { month, compras: 0, vendas: 0 }
    if (txn.type === 'buy') existing.compras += value
    else existing.vendas += value
    map.set(month, existing)
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}
