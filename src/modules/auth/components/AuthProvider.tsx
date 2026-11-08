import { useEffect, type ReactNode } from 'react'
import { supabase } from '../../../shared/services/supabaseClient'
import { useAuthStore } from '../store'
import { useQueryClient } from '@tanstack/react-query'
import { clearSessionDrafts } from '../../../shared/utils/sessionDraft'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const setLoading = useAuthStore((state) => state.setLoading)

  useEffect(() => {
    let active = true
    let identity: string | null = null
    let authEventReceived = false
    const acceptSession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active) return
      const nextIdentity = session?.user.id ?? null
      if (identity !== nextIdentity || nextIdentity === null) {
        if (identity !== null || nextIdentity === null) clearSessionDrafts()
        // Cancel in-flight requests before removing data from the previous identity.
        void queryClient.cancelQueries()
        queryClient.clear()
      }
      identity = nextIdentity
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventReceived) acceptSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true
      acceptSession(session)
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [setUser, setSession, setLoading, queryClient])

  return children
}
