import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { positionService } from '../services/positionService'
import { Asset } from '../types'

/** Mínimo de caracteres antes de consultar o catálogo. */
const MIN_TERM_LENGTH = 2

/**
 * Sugestões do catálogo para o autocomplete de ticker. O termo entra na query
 * key, então cada termo é cacheado e digitar de volta não refaz a requisição.
 */
export function useAssetSearch(term: string) {
  const normalized = term.trim()

  return useQuery<Asset[]>({
    queryKey: ['portfolio', 'assets', normalized.toUpperCase()],
    queryFn: () => positionService.searchAssets(normalized),
    enabled: normalized.length >= MIN_TERM_LENGTH,
  })
}

/**
 * Consulta pontual do catálogo por ticker exato, para rodar no submit antes de
 * qualquer INSERT — é o que garante "Ativo não encontrado" no cliente e a FK
 * nunca violada no banco. Usa `fetchQuery` porque o momento da consulta é um
 * evento, não uma renderização; o resultado entra no mesmo cache.
 */
export function useAssetLookup() {
  const queryClient = useQueryClient()

  return useCallback(
    (ticker: string) => {
      const normalized = ticker.trim().toUpperCase()

      return queryClient.fetchQuery({
        queryKey: ['portfolio', 'asset', normalized],
        queryFn: () => positionService.findAssetByTicker(normalized),
      })
    },
    [queryClient],
  )
}
