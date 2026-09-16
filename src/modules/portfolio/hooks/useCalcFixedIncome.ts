import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../shared/services/supabaseClient'
import { fiQueryKey } from './useFixedIncomePositions'
import { useAuth } from '../../auth/hooks/useAuth'

export type CalcState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Dispara a Edge Function `calc-fixed-income` para recalcular os valores
 * atuais das posições de renda fixa do usuário e invalida o cache.
 *
 * A função é on-demand — chamada quando o usuário clica "Atualizar valores"
 * ou ao adicionar uma nova posição.
 */
export function useCalcFixedIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [state, setState] = useState<CalcState>('idle')
  const [error, setError] = useState<string | null>(null)

  const calc = useCallback(async () => {
    if (!user?.id) return
    setState('loading')
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada.')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calc-fixed-income`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: '{}',
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      // Invalida o cache para que a lista reflita os novos valores
      queryClient.invalidateQueries({ queryKey: fiQueryKey(user.id) })
      setState('success')
    } catch (e) {
      setError((e as Error).message)
      setState('error')
    }
  }, [user?.id, queryClient])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
  }, [])

  return { calc, state, error, reset, isLoading: state === 'loading' }
}
