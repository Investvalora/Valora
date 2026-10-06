import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { navItemsNovo } from './navNovo'

type Props = {
  accountName: string
  alertCount?: number
  compact: boolean
  onToggle: () => void
}

export function SidebarNovo({
  accountName,
  alertCount = 0,
  compact,
  onToggle,
}: Props) {
  const initials = accountName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside
      className={`
        relative flex h-full shrink-0 flex-col
        border-r border-white/[0.08]
        bg-[#1C1C1C]
        transition-[width] duration-200 ease-in-out
        ${compact ? 'w-[56px]' : 'w-[240px]'}
        overflow-visible
        py-7
        ${compact ? 'px-2' : 'px-4'}
      `}
    >
      {/* ── Logo / toggle ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={compact ? 'Expandir menu' : 'Recolher menu'}
        className={`
          group mb-8 flex items-center gap-2.5
          rounded-xl px-3 py-1.5
          transition-colors hover:bg-white/[0.05]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          ${compact ? 'justify-center' : ''}
        `}
      >
        {/* Marca gradiente */}
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px]"
          style={{ background: 'linear-gradient(135deg, #4FC35A 0%, #7987FF 100%)' }}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4l6 8 6-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        {/* Nome VALORA — só quando expandido */}
        {!compact && (
          <span className="flex-1 text-[18px] font-semibold tracking-[0.04em] text-white">
            VALORA
          </span>
        )}

        {/* Ícone de colapso — aparece no hover quando expandido */}
        {!compact && (
          <PanelLeftClose
            className="h-4 w-4 shrink-0 text-[#7D7D7D] opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        )}
      </button>

      {/* ── Nav ── */}
      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {navItemsNovo.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              group/item relative flex items-center rounded-xl py-2.5
              text-[14px] font-medium
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              ${compact ? 'justify-center px-0' : 'gap-3.5 px-3'}
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
                      : 'text-[#7D7D7D] group-hover/item:text-white'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />

                {/* Label — só quando expandido */}
                {!compact && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {/* Badge alerta — só quando expandido */}
                {!compact && item.path === '/analise' && alertCount > 0 && (
                  <span className="text-[11px] font-medium text-nf-blue">
                    {alertCount}
                  </span>
                )}

                {/* Badge compacto (ponto) */}
                {compact && item.path === '/analise' && alertCount > 0 && (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-nf-blue"
                    aria-hidden="true"
                  />
                )}

                {/* Tooltip compacto */}
                {compact && (
                  <span
                    className="
                      pointer-events-none absolute left-full top-1/2 z-50
                      ml-3 -translate-y-1/2 translate-x-1 scale-[0.96]
                      whitespace-nowrap rounded-[10px]
                      border border-white/[0.12] bg-white/[0.08]
                      px-3 py-1.5 text-[12px] font-medium text-white
                      opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.35)]
                      backdrop-blur-[20px]
                      transition-all duration-150 delay-75
                      group-hover/item:translate-x-0 group-hover/item:scale-100 group-hover/item:opacity-100
                    "
                  >
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Botão expandir (compacto) ── */}
      {compact && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expandir menu"
          className="
            group/expand mx-auto mb-2 flex h-8 w-8 items-center justify-center
            rounded-lg text-[#7D7D7D]
            transition-colors hover:bg-white/[0.06] hover:text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          "
        >
          <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}

      {/* ── Usuário ── */}
      <div className={`border-t border-white/[0.08] pt-4 ${compact ? 'mt-2' : 'mt-4'}`}>
        <NavLink
          to="/conta"
          className={({ isActive }) => `
            group/user relative flex items-center rounded-xl py-2
            transition-all duration-150
            ${compact ? 'justify-center px-0' : 'gap-3 px-3'}
            ${isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'}
          `}
        >
          {/* Avatar */}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#A66AF4] text-[13px] font-medium text-white">
            {initials || 'S'}
          </span>

          {/* Nome — só quando expandido */}
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-white">
                {accountName}
              </span>
              <span className="block text-[11px] text-[#8F8F8F]">Investidor</span>
            </span>
          )}

          {/* Tooltip compacto */}
          {compact && (
            <span
              className="
                pointer-events-none absolute left-full top-1/2 z-50
                ml-3 -translate-y-1/2 translate-x-1 scale-[0.96]
                whitespace-nowrap rounded-[10px]
                border border-white/[0.12] bg-white/[0.08]
                px-3 py-1.5 text-[12px] font-medium text-white
                opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.35)]
                backdrop-blur-[20px]
                transition-all duration-150 delay-75
                group-hover/user:translate-x-0 group-hover/user:scale-100 group-hover/user:opacity-100
              "
            >
              {accountName}
            </span>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
