import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useNewAlertsCount } from '../../modules/alerts/hooks/useAlerts'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { data: alertCount = 0 } = useNewAlertsCount()
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCompact, setIsSidebarCompact] = useState(false)
  const fullName = user?.user_metadata?.full_name
  const accountName = typeof fullName === 'string' && fullName.trim()
    ? fullName
    : user?.email?.split('@')[0] ?? 'Sua conta'

  return (
    <div className="flex min-h-dvh bg-dark-bg text-slate-100">
      <aside className={`hidden shrink-0 border-r border-dark-border bg-dark-surface transition-[width] duration-200 md:block ${isSidebarCompact ? 'w-[56px]' : 'w-[200px]'}`}>
        <Sidebar
          alertCount={alertCount}
          accountName={accountName}
          email={user?.email}
          compact={isSidebarCompact}
          onToggle={() => setIsSidebarCompact((value) => !value)}
        />
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/65" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative z-10 h-full w-72 border-r border-dark-border bg-dark-surface shadow-2xl">
            <Sidebar
              alertCount={alertCount}
              accountName={accountName}
              email={user?.email}
              onNavigate={() => setIsMobileMenuOpen(false)}
              mobile
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-dark-border bg-dark-surface/90 px-4 backdrop-blur md:hidden">
          <span className="text-lg font-bold tracking-tight text-white">Valora</span>
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400/70"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
