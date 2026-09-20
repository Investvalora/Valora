import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { insightService } from '../services/insightService'
import type {
  CreateBazinInsightPayload,
  CreateGrahamInsightPayload,
  InsightRecord,
} from '../types'

export function insightsQueryKey(userId: string | undefined) {
  return ['valuation', 'insights', userId] as const
}

/** Lista os insights salvos do usuário autenticado. */
export function useInsights() {
  const { user, loading } = useAuth()
  const userId = user?.id

  const query = useQuery<InsightRecord[]>({
    queryKey: insightsQueryKey(userId),
    queryFn: () => insightService.listInsights(userId as string),
    enabled: Boolean(userId),
  })

  return { ...query, isLoading: query.isLoading || loading }
}

/** Salva um novo insight Bazin. */
export function useCreateBazinInsight() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: (payload: CreateBazinInsightPayload) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente.')
      return insightService.createBazinInsight(userId, payload)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: insightsQueryKey(userId) }),
  })
}

/** Salva um novo insight Graham. */
export function useCreateGrahamInsight() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: (payload: CreateGrahamInsightPayload) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente.')
      return insightService.createGrahamInsight(userId, payload)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: insightsQueryKey(userId) }),
  })
}

/** Remove um insight pelo id. */
export function useDeleteInsight() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: (insightId: string) => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente.')
      return insightService.deleteInsight(userId, insightId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: insightsQueryKey(userId) }),
  })
}
