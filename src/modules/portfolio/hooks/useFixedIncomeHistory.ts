import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { fixedIncomeService } from '../services/fixedIncomeService'
import type { NewFixedIncomeEvent } from '../types'

export function useFixedIncomeHistory(walletId?: string) {
  const { user } = useAuth()
  return useQuery({ queryKey: ['portfolio', 'fixed-income-history', user?.id, walletId], queryFn: () => fixedIncomeService.listHistory(user!.id, walletId), enabled: Boolean(user) && walletId !== '', staleTime: 300000 })
}

export function useAddFixedIncomeEvent() {
  const client = useQueryClient()
  const { user } = useAuth()
  return useMutation({ mutationFn: (event: NewFixedIncomeEvent) => {
    if (!user) throw new Error('Entre novamente para registrar o movimento.')
    return fixedIncomeService.addEvent(event)
  }, onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['portfolio', 'fixed-income', user?.id] })
    void client.invalidateQueries({ queryKey: ['portfolio', 'fixed-income-history', user?.id] })
  } })
}
