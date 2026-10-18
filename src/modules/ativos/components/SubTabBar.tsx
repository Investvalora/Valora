/**
 * SubTabBar — barra de abas reutilizável para as sub-rotas de Ativos,
 * Desempenho e Análise. Usa NavLink do react-router-dom para destacar
 * a tab ativa com underline azul.
 */
import { NavLink, useLocation } from 'react-router-dom'

type TabItem = {
  label: string
  to: string
}

type SubTabBarProps = {
  tabs: TabItem[]
  mobileVariant?: 'default' | 'segmented'
}

export function SubTabBar({ tabs, mobileVariant = 'default' }: SubTabBarProps) {
  const segmented = mobileVariant === 'segmented'
  const { pathname } = useLocation()
  const activeIndex = Math.max(0, tabs.findIndex(({ to }) => pathname === to || pathname.startsWith(`${to}/`)))

  return (
    <div
      className={segmented
        ? 'relative grid w-full grid-cols-3 border-b border-white/[0.08] md:flex md:w-auto md:gap-6 md:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        : 'flex gap-6 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}
      role="tablist"
    >
      {segmented && (
        <span
          data-testid="subtab-selection-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-1/3 rounded-full bg-nf-blue transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      )}
      {tabs.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={false}
          role="tab"
          aria-selected={segmented ? pathname === to || pathname.startsWith(`${to}/`) : undefined}
          className={({ isActive }) =>
            segmented
              ? [
                  'relative z-10 flex min-h-9 min-w-0 items-center justify-center px-1 text-center text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue md:-mb-px md:min-h-0 md:border-b-2 md:px-0 md:pb-2.5 md:text-sm md:whitespace-nowrap',
                  isActive
                    ? 'text-white md:border-nf-blue'
                    : 'text-white/55 hover:text-white/80 md:border-transparent',
                ].join(' ')
              : [
                  'pb-2.5 px-0 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  isActive
                    ? 'border-nf-blue text-white'
                    : 'border-transparent text-white/50 hover:text-white/80',
                ].join(' ')
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}
