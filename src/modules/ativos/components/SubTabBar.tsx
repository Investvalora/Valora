/**
 * SubTabBar — barra de abas reutilizável para as sub-rotas de Ativos,
 * Desempenho e Análise. Usa NavLink do react-router-dom para destacar
 * a tab ativa com underline azul.
 */
import { NavLink } from 'react-router-dom'

type TabItem = {
  label: string
  to: string
}

type SubTabBarProps = {
  tabs: TabItem[]
}

export function SubTabBar({ tabs }: SubTabBarProps) {
  return (
    <div className="flex gap-6 border-b border-white/[0.08]" role="tablist">
      {tabs.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          end
          role="tab"
          className={({ isActive }) =>
            [
              'pb-2.5 px-0 text-sm font-medium transition-colors border-b-2 -mb-px',
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
