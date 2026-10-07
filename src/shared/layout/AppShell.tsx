import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useNewAlertsCount } from '../../modules/alerts/hooks/useAlerts'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function AppShell() {
  const { data: alertCount = 0 } = useNewAlertsCount()
  const { user } = useAuth()
  const [isSidebarCompact, setIsSidebarCompact] = useState(false)
  const fullName = user?.user_metadata?.full_name
  const accountName = typeof fullName === 'string' && fullName.trim()
    ? fullName
    : user?.email?.split('@')[0] ?? 'Sua conta'

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
        <main className="min-w-0 flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:pb-0 md:pt-0">
          <Outlet />
        </main>
      </div>

      <MobileNav alertCount={alertCount} />
    </div>
  )
}
