import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { transactionsService } from '../services/transactionsService'
import type { ParsedTransactionRow } from '../csv/csvParser'
import { useWallets } from './useWallets'
import { syncAssetData } from '../services/assetDataSync'

export function useImportTransactions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const { selectedWallet } = useWallets()

  return useMutation<number, Error, ParsedTransactionRow[]>({
    mutationFn: (rows) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para importar transações.')
      if (!selectedWallet) throw new Error('Selecione uma carteira.')
      return transactionsService.importTransactions(userId, rows, selectedWallet.id)
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'transactions-all', userId] })
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
      if (userId) void (async () => {
        for (const ticker of new Set(rows.filter(row => row.type === 'buy').map(row => row.ticker))) await syncAssetData(queryClient, userId, ticker)
      })()
    },
  })
}
