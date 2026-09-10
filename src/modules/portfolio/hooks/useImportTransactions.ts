import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { transactionsService } from '../services/transactionsService'
import { positionsQueryKey } from './usePositions'
import type { ParsedTransactionRow } from '../csv/csvParser'

export function useImportTransactions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation<number, Error, ParsedTransactionRow[]>({
    mutationFn: (rows) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para importar transações.')
      return transactionsService.importTransactions(userId, rows)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
    },
  })
}