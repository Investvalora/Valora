import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useNewAlertsCount } from '../../modules/alerts/hooks/useAlerts'

const menuItems = [
  { path: '/carteira', label: 'Carteira' },
  { path: '/patrimonio', label: 'Patrimônio' },
  { path: '/proventos', label: 'Proventos' },
  { path: '/rentabilidade', label: 'Rentabilidade' },
  { path: '/score', label: 'Score' },
  { path: '/estrategias', label: 'Estratégias' },
  { path: '/alertas', label: 'Alertas' },
]

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: newAlerts = 0 } = useNewAlertsCount()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-dark-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-surface border-r border-dark-border flex-shrink-0 flex flex-col">
        <div className="p-6 flex-1">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-4">Valora</h1>
            {user?.email && (
              <p className="text-xs text-gray-500 truncate mb-3" title={user.email}>
                {user.email}
              </p>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 border border-red-500/30 transition-colors text-left"
            >
              Sair
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-dark-bg hover:text-white'
                  }`
                }
              >
                <span className="flex items-center justify-between gap-3">
                  {item.label}
                  {item.path === '/alertas' && newAlerts > 0 && (
                    <span aria-label={`${newAlerts} alertas novos`} className="min-w-5 rounded-full bg-amber-400 px-1.5 py-0.5 text-center text-xs font-bold text-slate-950">
                      {newAlerts}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
