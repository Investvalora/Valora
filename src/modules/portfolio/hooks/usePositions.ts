import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../services/positionService'
import { PositionWithAsset } from '../types'

/**
 * Query key das posições, no padrão `['dominio','recurso',...params]`.
 * Exportada para que a mutation invalide exatamente esta entrada.
 */
export function positionsQueryKey(userId: string | undefined, walletId?: string) {
  return ['portfolio', 'positions', userId, walletId] as const
}

/** Posições do usuário da sessão. */
export function usePositions(walletId?: string) {
  const { user, loading: isSessionLoading } = useAuth()
  const userId = user?.id

  const query = useQuery<PositionWithAsset[]>({
    queryKey: positionsQueryKey(userId, walletId),
    queryFn: () => positionService.listPositions(userId as string, walletId),
    enabled: Boolean(userId) && walletId !== '',
  })

  return {
    ...query,
    // Enquanto a sessão está sendo restaurada não existe `userId`, a query
    // fica desabilitada e `isLoading` é falso. Sem somar o estado da sessão, a
    // página concluiria "nenhuma posição" antes de qualquer consulta ao banco.
    isLoading: query.isLoading || isSessionLoading || walletId === '',
  }
}
