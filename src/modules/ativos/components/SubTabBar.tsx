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
  const matchesPath = (to: string) => {
    const tabPath = to.split('?')[0]
    return pathname === tabPath || pathname.startsWith(`${tabPath}/`)
  }
  const activeIndex = Math.max(0, tabs.findIndex(({ to }) => matchesPath(to)))

  return (
    <div
      className={segmented
        // Mobile: flex rolável horizontalmente (sem quebra de linha).
        // Desktop: flex normal com gap, sem overflow.
        ? 'relative flex w-full gap-0 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-6 md:overflow-visible'
        : 'flex gap-6 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}
      role="tablist"
    >
      {segmented && (
        <span
          data-testid="subtab-selection-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-nf-blue transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden"
          style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
      )}
      {tabs.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={false}
          role="tab"
          aria-selected={segmented ? matchesPath(to) : undefined}
          className={() =>
            segmented
              ? [
                  // Mobile: cada tab tem tamanho igual (flex-1) mas nunca quebra linha.
                  // Desktop: tamanho natural com whitespace-nowrap.
                  'relative z-10 flex min-h-9 flex-1 items-center justify-center whitespace-nowrap px-2 text-center text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue md:min-h-0 md:flex-none md:border-b-2 md:px-0 md:pb-2.5 md:text-sm',
                  matchesPath(to)
                    ? 'text-white md:border-nf-blue'
                    : 'text-white/55 hover:text-white/80 md:border-transparent',
                ].join(' ')
              : [
                  'pb-2.5 px-0 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  matchesPath(to)
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
