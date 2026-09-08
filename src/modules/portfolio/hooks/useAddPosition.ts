import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../services/positionService'
import { NewPosition, Position } from '../types'
import { positionsQueryKey } from './usePositions'

/**
 * Cadastro de posição. O `user_id` vem da sessão; a lista revalida por
 * invalidação de cache, sem recarregar a página.
 */
export function useAddPosition() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  return useMutation<Position, Error, NewPosition>({
    mutationFn: (position: NewPosition) => {
      if (!userId) throw new Error('Sessão expirada. Entre novamente para cadastrar posições.')
      return positionService.addPosition(userId, position)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
    },
  })
}
