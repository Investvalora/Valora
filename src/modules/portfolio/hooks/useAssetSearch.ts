import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { positionService } from '../services/positionService'
import { Asset } from '../types'
import { quotesQueryKey } from './useLatestQuotes'

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

/**
 * Cotação mais recente de um único ticker — usada para pré-preencher campos de
 * preço ao selecionar um ativo no autocomplete.
 *
 * Reutiliza o cache de `useLatestQuotes` quando os dados já estão presentes
 * (ex.: o usuário veio da Carteira). Caso contrário, faz a busca pontual via
 * `positionService.listLatestQuotes([ticker])`.
 *
 * Retorna `null` enquanto carrega ou quando não há cotação disponível.
 */
export function useTickerLatestPrice(ticker: string): number | null {
  const normalized = ticker.trim().toUpperCase()
  const queryClient = useQueryClient()

  const result = useQuery({
    queryKey: quotesQueryKey([normalized]),
    queryFn: () => positionService.listLatestQuotes([normalized]),
    enabled: normalized.length >= 4,
    staleTime: 60 * 1000,
  })

  // Tenta primeiro o cache da carteira inteira (evita nova request)
  if (normalized.length >= 4) {
    const allQueries = queryClient.getQueriesData<{ ticker: string; close: number }[]>({
      queryKey: ['portfolio', 'quotes'],
    })
    for (const [, data] of allQueries) {
      if (!data) continue
      const row = data.find((q) => q.ticker === normalized)
      if (row && Number.isFinite(Number(row.close)) && Number(row.close) > 0) {
        return Number(row.close)
      }
    }
  }

  const row = result.data?.[0]
  if (!row) return null
  const close = Number(row.close)
  return Number.isFinite(close) && close > 0 ? close : null
}
