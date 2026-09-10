import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { alertsQueryKey } from './useAlerts'
import { alertsService } from '../services/alertsService'
import type { AlertStatus } from '../types'

export function useGenerateAlerts() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para gerar alertas.')
      return alertsService.generateAlerts()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey(userId) }),
  })
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: AlertStatus }) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para atualizar o alerta.')
      return alertsService.updateStatus(userId, alertId, status)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey(userId) }),
  })
}