import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <p className="text-gray-400">Carregando...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/carteira" replace />
  }

  return <Outlet />
}
