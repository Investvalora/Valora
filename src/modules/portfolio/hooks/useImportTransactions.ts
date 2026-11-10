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

  return useMutation<{ count: number; duplicate: boolean }, Error, { rows: ParsedTransactionRow[]; fileName: string; walletId: string }>({
    mutationFn: ({ rows, fileName, walletId }) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para importar transações.')
      if (!selectedWallet || selectedWallet.id !== walletId) throw new Error('A carteira mudou. Confira o destino.')
      return transactionsService.importTransactions(userId, rows, walletId, fileName)
    },
    onSuccess: (result, { rows }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'transactions-all', userId] })
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
      if (userId && !result.duplicate) void (async () => {
        for (const ticker of new Set(rows.filter(row => row.type === 'buy' && row.selected && !row.skipped && !row.errors.length).map(row => row.ticker))) await syncAssetData(queryClient, userId, ticker)
      })()
    },
  })
}
