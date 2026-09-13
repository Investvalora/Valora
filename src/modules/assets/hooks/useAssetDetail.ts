import { useQuery } from '@tanstack/react-query'
import { positionService } from '../../portfolio/services/positionService'
import type { Asset } from '../../portfolio/types'

/** staleTime de 1 hora — dados do catálogo mudam raramente. */
const STALE_TIME_MS = 60 * 60 * 1000

export function assetDetailQueryKey(ticker: string) {
  return ['assets', 'detail', ticker.toUpperCase()] as const
}

/**
 * Busca os metadados do ativo no catálogo (nome, tipo, moeda).
 * Retorna `null` quando o ticker não existe no catálogo.
 */
export function useAssetDetail(ticker: string) {
  const normalizedTicker = ticker.toUpperCase()

  return useQuery<Asset | null>({
    queryKey: assetDetailQueryKey(normalizedTicker),
    queryFn: () => positionService.findAssetByTicker(normalizedTicker),
    enabled: Boolean(normalizedTicker),
    staleTime: STALE_TIME_MS,
  })
}
