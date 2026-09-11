import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { scoreService } from '../services/scoreService'
import type { NewScoreRule, ScoreRule, UpdateScoreRule } from '../types'

/** staleTime de 5 minutos — regras de score mudam pouco durante a sessão. */
const STALE_TIME_MS = 5 * 60 * 1000

/** Query key estruturada por domínio, recurso e userId. */
export function scoreRulesQueryKey(userId: string | undefined) {
  return ['score', 'rules', userId] as const
}

/** Lista todas as regras de score do usuário autenticado. */
export function useScoreRules() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: scoreRulesQueryKey(userId),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.listRules(userId)
    },
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })
}

/** Cria uma nova regra de score. Invalida o cache de regras após sucesso. */
export function useCreateScoreRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (payload: NewScoreRule) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.createRule(userId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoreRulesQueryKey(userId) })
    },
  })
}

/** Atualiza uma regra de score existente. Invalida o cache de regras após sucesso. */
export function useUpdateScoreRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScoreRule }) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.updateRule(id, userId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoreRulesQueryKey(userId) })
    },
  })
}

/** Remove uma regra de score. Invalida o cache de regras e preferências após sucesso. */
export function useDeleteScoreRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error('Sessão não encontrada')
      return scoreService.deleteRule(id, userId)
    },
    onSuccess: () => {
      // Invalida regras e preferências (default_score_rule_id pode ter virado null via ON DELETE SET NULL)
      queryClient.invalidateQueries({ queryKey: scoreRulesQueryKey(userId) })
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['score', 'preferences', userId] })
      }
    },
  })
}

/**
 * Agrupa regras por `name`, retornando um Map de nome → lista de regras.
 * Útil para exibir os scores como grupos na UI.
 */
export function groupRulesByName(rules: ScoreRule[]): Map<string, ScoreRule[]> {
  const map = new Map<string, ScoreRule[]>()
  for (const rule of rules) {
    const group = map.get(rule.name) ?? []
    group.push(rule)
    map.set(rule.name, group)
  }
  return map
}
