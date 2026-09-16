import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../shared/services/supabaseClient'
import { Asset } from '../types'

/** Resposta da Edge Function lookup-asset. */
interface LookupResult {
  ticker: string
  name: string
  type: Asset['type']
  currency: Asset['currency']
  created: boolean
}

interface LookupError {
  error: 'not_found' | 'bad_request' | 'internal'
  message: string
}

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; asset: Asset; created: boolean }
  | { status: 'not_found'; ticker: string }
  | { status: 'error'; message: string }

/**
 * Busca um ativo na API externa (brapi) via Edge Function lookup-asset.
 * Chamado quando o ticker não está no catálogo local.
 *
 * Ao encontrar, invalida o cache de busca de ativos para que o ticker
 * apareça imediatamente no autocomplete sem precisar recarregar a página.
 */
export function useLookupExternalAsset() {
  const [state, setState] = useState<LookupState>({ status: 'idle' })
  const queryClient = useQueryClient()

  const lookup = useCallback(async (ticker: string) => {
    const normalized = ticker.trim().toUpperCase()
    if (!normalized) return

    setState({ status: 'loading' })

    try {
      // Chama a Edge Function com o JWT do usuário logado (sessão corrente)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-asset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ticker: normalized }),
        },
      )

      if (response.status === 404) {
        setState({ status: 'not_found', ticker: normalized })
        return
      }

      if (!response.ok) {
        const err = await response.json() as LookupError
        setState({ status: 'error', message: err.message ?? 'Erro ao buscar ativo.' })
        return
      }

      const data = await response.json() as LookupResult

      const asset: Asset = {
        ticker: data.ticker,
        name: data.name,
        type: data.type,
        currency: data.currency,
      }

      // Injeta no cache de lookup exato para que useAssetLookup não precise
      // refazer a requisição no submit do formulário.
      queryClient.setQueryData(['portfolio', 'asset', asset.ticker], asset)

      // Invalida a busca por substring para que o novo ativo apareça no
      // autocomplete se o usuário digitar novamente.
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'assets'] })

      setState({ status: 'found', asset, created: data.created })
    } catch {
      setState({ status: 'error', message: 'Não foi possível conectar à API. Tente novamente.' })
    }
  }, [queryClient])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, lookup, reset }
}
