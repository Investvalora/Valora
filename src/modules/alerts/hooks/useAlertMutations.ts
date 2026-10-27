import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { alertsQueryKey } from './useAlerts'
import { alertsService } from '../services/alertsService'
import type { Alert, AlertCondition, AlertStatus, EditAlertPayload } from '../types'

export function useEditAlert() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ alert, payload }: { alert: Alert; payload: EditAlertPayload }) => {
      if (!user?.id) throw new Error('Sessão ausente. Entre novamente para editar o alerta.')
      return alertsService.editAlert(user.id, alert, payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey(user?.id) }),
  })
}

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

export function useCreatePriceTargetAlert() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: ({
      ticker,
      targetPrice,
      condition,
    }: {
      ticker: string
      targetPrice: number
      condition: AlertCondition
    }) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para criar o alerta.')
      return alertsService.createPriceTargetAlert(userId, ticker, targetPrice, condition)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey(userId) }),
  })
}

export function useCheckPriceTargets() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente para verificar preços-alvo.')
      return alertsService.checkPriceTargets()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey(userId) }),
  })
}
