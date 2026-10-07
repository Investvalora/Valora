import { Bell, ChartColumn, FileText, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { path: '/carteira', label: 'Carteira', icon: Wallet },
  { path: '/patrimonio', label: 'Patrimônio', icon: ChartColumn },
  { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
  { path: '/alertas', label: 'Alertas', icon: Bell },
]

export function MobileNav({ alertCount }: { alertCount: number }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-700 bg-[#2b2b2b] pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 text-[11px] leading-none ${
              isActive ? 'text-white' : 'text-zinc-500'
            }`
          }
        >
          <span className="relative">
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.path === '/alertas' && alertCount > 0 && (
              <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
