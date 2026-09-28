import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bell, ChartColumn, FileText, Wallet } from 'lucide-react'
import { useNewAlertsCount } from '../../modules/alerts/hooks/useAlerts'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { data: alertCount = 0 } = useNewAlertsCount()
  const { user } = useAuth()
  const [isSidebarCompact, setIsSidebarCompact] = useState(false)
  const fullName = user?.user_metadata?.full_name
  const accountName = typeof fullName === 'string' && fullName.trim()
    ? fullName
    : user?.email?.split('@')[0] ?? 'Sua conta'

  const mobileItems = [
    { path: '/carteira', label: 'Carteira', icon: Wallet },
    { path: '/patrimonio', label: 'Patrimônio', icon: ChartColumn },
    { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
    { path: '/alertas', label: 'Alertas', icon: Bell },
  ]

  return (
    <div className="flex min-h-dvh bg-[#121212] text-slate-100">
      <aside className={`hidden shrink-0 border-r border-dark-border bg-dark-surface transition-[width] duration-200 md:block ${isSidebarCompact ? 'w-[56px]' : 'w-[200px]'}`}>
        <Sidebar
          alertCount={alertCount}
          accountName={accountName}
          email={user?.email}
          compact={isSidebarCompact}
          onToggle={() => setIsSidebarCompact((value) => !value)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-auto pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:pb-0 md:pt-0">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-700 bg-[#2b2b2b] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
      >
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                isActive ? 'text-white' : 'text-zinc-500'
              }`
            }
          >
            <span className="relative">
              <item.icon className="h-6 w-6" aria-hidden="true" />
              {item.path === '/alertas' && alertCount > 0 && (
                <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-purple-400" />
              )}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
