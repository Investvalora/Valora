import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  sessionEnded: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  sessionEnded: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set(session ? { session, sessionEnded: false } : { session }),
  setLoading: (loading) => set({ loading }),
}))
