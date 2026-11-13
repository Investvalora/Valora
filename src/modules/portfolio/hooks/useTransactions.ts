import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  transactionsService,
  type NewManualTransaction,
  type TransactionEdit,
} from '../services/transactionsService'
import { positionService } from '../services/positionService'
import { useWallets } from './useWallets'
import { syncAssetData } from '../services/assetDataSync'

const STALE_TIME_MS = 5 * 60 * 1000

export function useEditTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ original, changes }: { original: Transaction; changes: TransactionEdit }) => {
      if (!user?.id || original.user_id !== user.id) throw new Error('Sessão não encontrada.')
      return transactionsService.editTransaction(original, changes)
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (cause) => {
      if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '40001') {
        return queryClient.invalidateQueries()
      }
    },
  })
}

export function transactionsByTickerQueryKey(userId: string | undefined, ticker: string) {
  return ['portfolio', 'transactions', userId, ticker.toUpperCase()] as const
}

/** Lista de transações de um ticker do usuário. */
export function useTransactionsByTicker(ticker: string) {
  const { user } = useAuth()
  const userId = user?.id
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  return useQuery({
    queryKey: [...transactionsByTickerQueryKey(userId, ticker), walletId],
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.listByTicker(userId, ticker, walletId)
    },
    enabled: Boolean(userId) && Boolean(ticker) && Boolean(walletId),
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
  const { selectedWallet } = useWallets()

  return useMutation({
    mutationFn: (payload: NewManualTransaction) => {
      if (!userId) throw new Error('Sessão não encontrada')
      if (!selectedWallet) throw new Error('Selecione uma carteira.')
      return transactionsService.addManualTransaction(userId, {
        ...payload,
        wallet_id: selectedWallet.id,
      })
    },
    onSuccess: (_, payload) => {
      if (payload.type === 'buy' && userId) void syncAssetData(queryClient, userId, payload.ticker)
      queryClient.invalidateQueries({
        queryKey: transactionsByTickerQueryKey(userId, payload.ticker),
      })
      // O trigger de banco recalculate_position atualiza positions:
      // invalida a query para refletir o novo preço médio / quantidade.
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'transactions-all', userId] })
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
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'transactions-all', userId] })
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
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
    },
  })
}

export function allTransactionsQueryKey(userId: string | undefined, walletId?: string) {
  return ['portfolio', 'transactions-all', userId, walletId] as const
}

/** Lista todas as transações do usuário (todos os tickers). */
export function useAllTransactions(walletOverride?: string) {
  const { user } = useAuth()
  const userId = user?.id
  const { selectedWallet } = useWallets()
  const walletId = walletOverride ?? selectedWallet?.id ?? ''

  return useQuery({
    queryKey: allTransactionsQueryKey(userId, walletId),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return transactionsService.listAll(userId, walletId)
    },
    enabled: Boolean(userId) && Boolean(walletId),
    staleTime: STALE_TIME_MS,
  })
}

// ─── Utilitários de agrupamento para o gráfico ────────────────────────────────

import type { Transaction } from '../services/transactionsService'
export { buildMonthlyAportes, type MonthlyAportePoint } from '../monthlyAportes'
