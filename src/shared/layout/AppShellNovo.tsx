import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useNewAlertsCount } from '../../modules/alerts/hooks/useAlerts'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { SidebarNovo } from './SidebarNovo'
import { TopBar } from '../components/TopBar'

export function AppShellNovo() {
  const { data: alertCount = 0 } = useNewAlertsCount()
  const { user } = useAuth()
  const [compact, setCompact] = useState(false)

  const fullName = user?.user_metadata?.full_name
  const accountName =
    typeof fullName === 'string' && fullName.trim()
      ? fullName
      : (user?.email?.split('@')[0] ?? 'Samuel')

  return (
    <div className="flex h-dvh overflow-hidden bg-[#131313] text-white">
      {/* ── Sidebar desktop ── */}
      <SidebarNovo
        accountName={accountName}
        alertCount={alertCount}
        compact={compact}
        onToggle={() => setCompact((v) => !v)}
      />

      {/* ── Área principal ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar alertCount={alertCount} />

        <main className="min-w-0 flex-1 overflow-y-auto px-10 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
