import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { normalizeTickers, positionService } from '../services/positionService'
import { LatestQuote } from '../types'

/**
 * Chave das cotações, no padrão `['dominio','recurso',...params]`.
 *
 * Sem `userId`: `price_history` é dado de mercado, legível por qualquer sessão
 * autenticada. Fatiar por usuário só fragmentaria o cache de duas carteiras que
 * contêm o mesmo ticker.
 */
export function quotesQueryKey(tickers: string[]) {
  return ['portfolio', 'quotes', tickers] as const
}

/**
 * Uma cotação de mercado muda ao longo do dia; 1 min é o `staleTime` que AD-11
 * prescreve para cotação.
 */
const QUOTES_STALE_TIME_MS = 60 * 1000

/**
 * Último fechamento dos tickers da carteira.
 *
 * Query separada da de posições de propósito: a lista precisa continuar de pé
 * quando a cotação falha, e uma query só faria as duas caírem juntas.
 */
export function useLatestQuotes(tickers: string[]) {
  const { user } = useAuth()
  const userId = user?.id

  // Normalizar aqui estabiliza a chave: a lista chega na ordem da tela, que o
  // usuário reordena, e a chave não deve mudar por causa disso.
  const wanted = useMemo(() => normalizeTickers(tickers), [tickers])

  return useQuery<LatestQuote[]>({
    queryKey: quotesQueryKey(wanted),
    queryFn: () => positionService.listLatestQuotes(wanted),
    // RLS de `price_history` exige sessão; sem tickers não há nada a buscar.
    enabled: Boolean(userId) && wanted.length > 0,
    staleTime: QUOTES_STALE_TIME_MS,
  })
}
