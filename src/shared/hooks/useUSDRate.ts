import { useQuery } from '@tanstack/react-query'
import { USDRate, usdRateService } from '../services/usdRateService'

/** Uma taxa por app, não por módulo: a chave é fixa de propósito. */
export const usdRateQueryKey = ['shared', 'usd-rate'] as const

/** Uma hora — AD-11: `staleTime` proporcional à frequência de mudança. */
const USD_RATE_STALE_TIME_MS = 60 * 60 * 1000

interface UseUSDRateOptions {
  /**
   * `false` mantém a query parada. Existe para a carteira só brasileira: sem
   * nenhum ativo em USD não há conversão a fazer, e buscar a taxa seria uma
   * requisição a terceiro para um número que ninguém vai usar.
   */
  enabled?: boolean
}

/**
 * Taxa USD/BRL da cadeia de AD-12.
 *
 * `retry` desligado porque a própria cadeia já é a política de nova tentativa:
 * o service percorre PTAX → AwesomeAPI → cache → constante e sempre resolve.
 * Repetir por cima disso só atrasaria a tela para chegar no mesmo resultado.
 */
export function useUSDRate({ enabled = true }: UseUSDRateOptions = {}) {
  return useQuery<USDRate>({
    queryKey: usdRateQueryKey,
    queryFn: () => usdRateService.getUSDRate(),
    enabled,
    staleTime: USD_RATE_STALE_TIME_MS,
    retry: false,
  })
}
