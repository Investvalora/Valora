import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { alertsService } from '../services/alertsService'
import type { Alert } from '../types'

export function alertsQueryKey(userId: string | undefined) {
  return ['alerts', userId] as const
}

export function useAlerts() {
  const { user, loading } = useAuth()
  const userId = user?.id
  const query = useQuery<Alert[]>({
    queryKey: alertsQueryKey(userId),
    queryFn: () => alertsService.listAlerts(userId as string),
    enabled: Boolean(userId),
  })

  return { ...query, isLoading: query.isLoading || loading }
}

export function useNewAlertsCount() {
  const { user, loading } = useAuth()
  const userId = user?.id
  const query = useQuery<number>({
    queryKey: [...alertsQueryKey(userId), 'new-count'],
    queryFn: () => alertsService.countNewAlerts(userId as string),
    enabled: Boolean(userId),
  })

  return { ...query, isLoading: query.isLoading || loading }
}