import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <p className="text-gray-400">Carregando...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/inicio" replace />
  }

  const view = pathname === '/cadastro' ? 'signup' : pathname === '/recuperar-senha' ? 'recovery' : 'login'

  return (
    <div className="auth-scene" data-auth-view={view}>
      <div className="auth-scene__blue" aria-hidden="true" />
      <div className="auth-scene__green" aria-hidden="true" />
      <div className="auth-scene__shade" aria-hidden="true" />
      <div className="auth-scene__content">
        <Outlet />
      </div>
    </div>
  )
}
