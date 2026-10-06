import { NavLink } from 'react-router-dom'
import { navItemsNovo } from './navNovo'

type Props = {
  accountName: string
  alertCount?: number
}

export function SidebarNovo({ accountName, alertCount = 0 }: Props) {
  // Iniciais do nome para o avatar
  const initials = accountName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside
      className="
        flex h-full w-[240px] shrink-0 flex-col
        border-r border-white/[0.08]
        bg-[#1C1C1C]
        px-4 py-7
      "
    >
      {/* ── Logo ── */}
      <div className="mb-8 flex items-center gap-2.5 px-3">
        {/* Marca gradiente */}
        <span
          className="
            grid h-[26px] w-[26px] shrink-0 place-items-center
            rounded-[8px]
          "
          style={{
            background:
              'linear-gradient(135deg, #4FC35A 0%, #7987FF 100%)',
          }}
          aria-hidden="true"
        >
          {/* chevron-down estilizado */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 4l6 8 6-8"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="text-[18px] font-semibold tracking-[0.04em] text-white">
          VALORA
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {navItemsNovo.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              group flex items-center gap-3.5 rounded-xl px-3 py-2.5
              text-[14px] font-medium
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#7D7D7D] hover:bg-white/[0.04] hover:text-white'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  aria-hidden="true"
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-[#7D7D7D] group-hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
                <span className="flex-1 truncate">{item.label}</span>

                {/* Badge de alertas na seção Análise */}
                {item.path === '/novo/analise' && alertCount > 0 && (
                  <span className="text-[11px] font-medium text-nf-blue">
                    {alertCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Usuário ── */}
      <div className="mt-4 border-t border-white/[0.08] pt-4">
        <NavLink
          to="/novo/conta"
          className={({ isActive }) => `
            flex items-center gap-3 rounded-xl px-3 py-2
            transition-all duration-150
            ${isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'}
          `}
        >
          {/* Avatar */}
          <span
            className="
              grid h-8 w-8 shrink-0 place-items-center
              rounded-full bg-[#A66AF4]
              text-[13px] font-medium text-white
            "
          >
            {initials || 'S'}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-white">
              {accountName}
            </span>
            <span className="block text-[11px] text-[#8F8F8F]">
              Investidor
            </span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}
