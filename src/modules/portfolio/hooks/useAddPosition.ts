import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { transactionsService } from '../services/transactionsService'
import { allTransactionsQueryKey } from './useTransactions'
import { positionsQueryKey } from './usePositions'
import type { NewPosition } from '../types'
import type { Transaction } from '../services/transactionsService'

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
 * Cadastro de posição via transação de compra.
 *
 * Em vez de inserir diretamente em `positions`, registra um lançamento `buy`
 * em `transactions`. O trigger `recalculate_position_on_transaction` no banco
 * reconstrói `positions` automaticamente a partir das transações, garantindo
 * que Lançamentos e Carteira estejam sempre sincronizados.
 *
 * `user_id` vem da sessão — nunca do formulário.
 */
export function useAddPosition() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  return useMutation<Transaction, Error, NewPosition>({
    mutationFn: (position: NewPosition) => {
      if (!userId) throw new MissingSessionError()
      return transactionsService.addManualTransaction(userId, {
        ticker: position.ticker,
        type: 'buy',
        quantity: position.quantity,
        price: position.average_price,
        brokerage_fee: 0,
        transaction_date: position.acquisition_date,
      })
    },
    onSuccess: () => {
      // Invalida posições (o trigger do banco as recalculou)
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(userId) })
      // Invalida a lista de lançamentos para a tela de Lançamentos atualizar
      queryClient.invalidateQueries({ queryKey: allTransactionsQueryKey(userId) })
      // Invalida o snapshot de posições usado por wealth/dashboard para que
      // novos tickers entrem imediatamente na série de patrimônio
      queryClient.invalidateQueries({ queryKey: ['wealth', 'positions-snapshot', userId] })
    },
  })
}
