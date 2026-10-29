import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Home, Wallet, TrendingUp, Target } from 'lucide-react'

// ── Ícones ────────────────────────────────────────────────────────────────────
// Inicio e Ativos usam Lucide igual ao Figma; Desempenho e Análise idem.

const NAV_ITEMS = [
  { path: '/inicio',     label: 'Início',      Icon: Home,      side: 'left'  },
  { path: '/ativos',     label: 'Ativos',      Icon: Wallet,    side: 'left'  },
  { path: '/desempenho', label: 'Desempenho',  Icon: TrendingUp, side: 'right' },
  { path: '/analise',    label: 'Análise',     Icon: Target,    side: 'right' },
] as const

interface MobileNavProps {
  alertCount: number
  onNovoLancamento: () => void
}

export function MobileNav({ alertCount, onNovoLancamento }: MobileNavProps) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let baseline = { width: window.innerWidth, height: window.innerHeight }
    const sync = () => {
      if (Math.abs(window.innerWidth - baseline.width) > 1) {
        baseline = { width: window.innerWidth, height: window.innerHeight }
      } else if (window.innerHeight > baseline.height) {
        baseline.height = window.innerHeight
      }
      // o Safari pode parar em 793px após um início de 852px no iphone 16 ou dispositivos com a tela nesse tamanho ou aproximado.
      // uma diferença pequena assim já é teclado fechado; não aguardamos altura idêntica.
      const keyboard = viewport.height < baseline.height - 120
      setKeyboardOpen(keyboard)
    }
    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync)
    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync)
    }
  }, [])

  return createPortal(
    <nav
      aria-label="Navegação principal"
      className={`mobile-navigation fixed inset-x-0 bottom-0 z-30 md:hidden ${keyboardOpen ? 'hidden' : ''}`}
      style={{ bottom: 0 }}
    >
      {/* ── Barra ── */}
      <div className="flex h-14 items-center bg-[#1e1e1e]">
        {/* Lado esquerdo */}
        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.filter((i) => i.side === 'left').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-[3px] pb-2 pt-1 text-[10px] font-normal leading-none transition-colors ${
                  isActive ? 'text-white' : 'text-[#666]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2 : 1.6}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Botão + central — placeholder de largura para centralizar */}
        <div className="w-[72px] shrink-0" aria-hidden="true" />

        {/* Lado direito */}
        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.filter((i) => i.side === 'right').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex min-w-0 flex-col items-center justify-center gap-[3px] pb-2 pt-1 text-[10px] font-normal leading-none transition-colors ${
                  isActive ? 'text-white' : 'text-[#666]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2 : 1.6}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {/* badge de alertas */}
                  {item.path === '/analise' && alertCount > 0 && (
                    <span
                      className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7987FF] px-0.5 text-[9px] font-bold text-white"
                      aria-label={`${alertCount} alertas`}
                    >
                      {alertCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Área de safe-area: estende o fundo da barra sem comprimir os ícones ── */}
      <div
        aria-hidden="true"
        className="bg-[#1e1e1e]"
        style={{ height: 'env(safe-area-inset-bottom)' }}
      />

      {/* ── Botão + flutuante ── */}
      <button
        type="button"
        onClick={onNovoLancamento}
        aria-label="Novo lançamento"
        className="
          absolute bottom-[calc(env(safe-area-inset-bottom)+0.125rem)]
          left-1/2 -translate-x-1/2
          flex h-[52px] w-[52px] items-center justify-center
          rounded-full bg-[#3273B1]
          shadow-[0_4px_20px_rgba(50,115,177,0.5)]
          transition-all active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
        "
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 4V18M4 11H18" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </nav>,
    document.body,
  )
}
