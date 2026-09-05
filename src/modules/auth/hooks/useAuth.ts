import { useAuthStore } from '../store'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
  }
}
