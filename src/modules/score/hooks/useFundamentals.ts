import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { fundamentalsService } from '../services/fundamentalsService'

/**
 * staleTime de 1 hora — fundamentals são dados de baixa frequência (seed
 * trimestral); não faz sentido refetch a cada 5 minutos como outros hooks.
 */
const STALE_TIME_MS = 60 * 60 * 1000

/**
 * Query key inclui os tickers normalizados para que a mesma carteira com os
 * mesmos tickers nunca resulte em chaves distintas.
 */
export function fundamentalsQueryKey(userId: string | undefined, tickers: string[]) {
  // Tickers ordenados para key estável independente da ordem da carteira.
  return ['score', 'fundamentals', userId, [...tickers].sort()] as const
}

/**
 * Fundamentals mais recentes para os tickers fornecidos.
 *
 * Desabilitado quando não há userId ou a lista de tickers está vazia — evita
 * consulta desnecessária à tabela para carteiras vazias.
 */
export function useFundamentals(tickers: string[]) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: fundamentalsQueryKey(userId, tickers),
    queryFn: () => {
      if (!userId) throw new Error('Sessão não encontrada')
      return fundamentalsService.listByTickers(tickers)
    },
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: STALE_TIME_MS,
  })
}
