import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../services/positionService'
import { PositionWithAsset } from '../types'

/**
 * Query key das posições, no padrão `['dominio','recurso',...params]`.
 * Exportada para que a mutation invalide exatamente esta entrada.
 */
export function positionsQueryKey(userId: string | undefined) {
  return ['portfolio', 'positions', userId] as const
}

/** Posições do usuário da sessão. */
export function usePositions() {
  const { user, loading: isSessionLoading } = useAuth()
  const userId = user?.id

  const query = useQuery<PositionWithAsset[]>({
    queryKey: positionsQueryKey(userId),
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
  })

  return {
    ...query,
    // Enquanto a sessão está sendo restaurada não existe `userId`, a query
    // fica desabilitada e `isLoading` é falso. Sem somar o estado da sessão, a
    // página concluiria "nenhuma posição" antes de qualquer consulta ao banco.
    isLoading: query.isLoading || isSessionLoading,
  }
}
