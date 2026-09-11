import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { scoreService } from '../services/scoreService'
import type { UpsertUserPreferences } from '../types'

const STALE_TIME_MS = 5 * 60 * 1000

/** Query key para preferências do usuário. */
export function scorePreferencesQueryKey(userId: string | undefined) {
  return ['score', 'preferences', userId] as const
}

/** Busca as preferências do usuário (incluindo score ativo). */
export function useScorePreferences() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: scorePreferencesQueryKey(userId),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.getPreferences(userId)
    },
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })
}

/** Cria ou atualiza as preferências do usuário. Invalida o cache após sucesso. */
export function useUpsertScorePreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (prefs: UpsertUserPreferences) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.upsertPreferences(userId, prefs)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scorePreferencesQueryKey(userId) })
    },
  })
}
