import { useAuthStore } from '../store'
import { authService } from '../services/authService'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)

  const logout = async () => {
    await authService.logout()
    setUser(null)
    setSession(null)
  }

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    logout,
  }
}
