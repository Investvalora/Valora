import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { alertsService } from '../services/alertsService'
import { alertsQueryKey } from './useAlerts'

/** Verifica ao entrar, recuperar foco e a cada minuto com o app visível. */
export function usePriceTargetMonitor() {
  const { user } = useAuth()
  const client = useQueryClient()
  return useQuery({
    queryKey: ['alerts', user?.id, 'price-target-check'],
    queryFn: async () => {
      const result = await alertsService.checkPriceTargets()
      if (result.triggered > 0) {
        // Não invalidar esta própria query, para evitar verificação em loop.
        await client.invalidateQueries({ queryKey: alertsQueryKey(user?.id), exact: true })
        await client.invalidateQueries({ queryKey: [...alertsQueryKey(user?.id), 'new-count'], exact: true })
      }
      return result
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
