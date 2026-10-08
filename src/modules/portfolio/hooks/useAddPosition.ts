import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../services/positionService'
import type { NewPosition, Position } from '../types'

/**
 * Código sintético da sessão ausente, no mesmo formato dos SQLSTATE que o
 * `PostgrestError` traz. O mapeamento de erro do formulário decide a mensagem
 * por `code`, então sem um código próprio este guard disparava e o usuário
 * recebia a mensagem genérica de falha — a explicação real ficava inalcançável.
 */
export const MISSING_SESSION_CODE = 'VALORA_MISSING_SESSION'

/** Erro do guard de sessão. A mensagem ao usuário é decidida na camada de UI. */
class MissingSessionError extends Error {
  readonly code = MISSING_SESSION_CODE

  constructor() {
    super('Sessão ausente ao cadastrar posição.')
    this.name = 'MissingSessionError'
  }
}

/**
 * Cadastro de posição diretamente na tabela `positions`.
 *
 * `user_id` vem da sessão — nunca do formulário.
 */
export function useAddPosition() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  return useMutation<Position, Error, NewPosition>({
    mutationFn: (position: NewPosition) => {
      if (!userId) throw new MissingSessionError()
      return positionService.addPosition(userId, position)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions', userId] })
    },
  })
}
