import { NavLink } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { navigationItems } from './navigation'

type SidebarProps = {
  alertCount: number
  accountName: string
  email?: string
  onNavigate?: () => void
  onToggle?: () => void
  compact?: boolean
  mobile?: boolean
}

export function Sidebar({
  alertCount,
  accountName,
  email,
  onNavigate,
  onToggle,
  compact = false,
  mobile = false,
}: SidebarProps) {
  const visibleLabels = mobile || !compact

  return (
    <aside className="flex h-full flex-col overflow-visible px-2 py-3">

      {/* Logo */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        aria-label={
          onToggle
            ? compact
              ? 'Expandir barra lateral'
              : 'Recolher barra lateral'
            : undefined
        }
        className={`
          mb-6 flex h-9 items-center
          transition-opacity hover:opacity-80
          focus:outline-none
          ${visibleLabels ? 'px-2' : 'justify-center'}
        `}
      >
        {visibleLabels ? (
          <span className="
            text-[18px] font-semibold tracking-[-0.04em] text-white
            transition-all hover:scale-105
          ">
            Valora
          </span>
        ) : (
          <span className="text-[17px] font-semibold text-white">
            V
          </span>
        )}
      </button>

      {/* Navegação */}
      <nav
        aria-label="Navegação principal"
        className="flex flex-1 flex-col gap-0.5 overflow-visible"
      >
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => `
              group relative flex h-10 items-center
              rounded-lg outline-none

              text-[13px] font-medium

              transition-all duration-150

              focus:outline-none
              focus-visible:outline-none

              hover:scale-[1.03]

              ${
                visibleLabels
                  ? 'gap-2.5 px-2.5'
                  : 'justify-center'
              }

              ${
                isActive
                  ? 'text-blue-400'
                  : 'text-zinc-200 hover:bg-white/[0.04] hover:text-white'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Ícone */}
                <span className="relative flex shrink-0 items-center justify-center">

                  <item.icon
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.1 : 1.8}
                    className={`
                      h-[18px] w-[18px]
                      transition-colors

                      ${
                        isActive
                          ? 'text-blue-400'
                          : 'text-zinc-300 group-hover:text-white'
                      }
                    `}
                  />

                  {/* Badge compacto */}
                  {item.path === '/alertas' &&
                    alertCount > 0 &&
                    !visibleLabels && (
                      <span
                        className="absolute -right-[7px] -top-[6px]  h-[6px] w-[6px] rounded-full bg-blue-400 ring-1 ring-[#09090b]
                        "
                      />
                    )}
                </span>

                {/* Label */}
                {visibleLabels && (
                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                  </span>
                )}

                {/* Quantidade de alertas */}
                {item.path === '/alertas' &&
                  alertCount > 0 &&
                  visibleLabels && (
                    <span
                      aria-label={`${alertCount} alertas novos`}
                      className="text-[11px] font-medium text-blue-400"
                    >
                      {alertCount}
                    </span>
                  )}

                {/* tolltip que aparece ao focar em uma guia da sidebar quando ela ta recolhida */}
                {!visibleLabels && (
                <span className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 translate-x-1 scale-[0.96] whitespace-nowrap rounded-[10px] border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white opacity-0 
                                 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-150 delay-75 
                                 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100" >

                    <span className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <span className="relative z-10">
                      {item.label}
                    </span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Conta */}
      <NavLink
        to="/conta"
        onClick={onNavigate}
        aria-label="Sua conta"
        className={({ isActive }) => `
          group relative mt-3 flex items-center
          rounded-lg

          transition-all duration-150

          focus:outline-none
          focus-visible:outline-none

          ${visibleLabels ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2'}

          ${
            isActive
              ? 'bg-white/[0.04]'
              : 'hover:bg-white/[0.04]'
          }
        `}
      >
       <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-zinc-200">
          <UserRound className="h-4 w-4"
            aria-hidden="true"
            strokeWidth={1.8}
          />
        </span>

        {visibleLabels && (
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-zinc-100">
              {accountName}
            </span>

            {email && (
              <span className="block truncate text-[11px] text-zinc-500">
                {email}
              </span>
            )}
          </span>
        )}

        {/* Tooltip da conta */}
        {!visibleLabels && (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 translate-x-1 scale-[0.96] whitespace-nowrap rounded-[10px] border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-150 delay-75
          group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100"
        >

            <span className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"/>
               <span className="relative z-10">
              Sua conta
            </span>
          </span>
        )}
      </NavLink>
    </aside>
  )
}