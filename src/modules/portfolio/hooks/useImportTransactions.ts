import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { transactionsService } from '../services/transactionsService'
import type { ParsedTransactionRow } from '../csv/csvParser'
import { useWallets } from './useWallets'

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'transactions-all', userId] })
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
    },
  })
}
