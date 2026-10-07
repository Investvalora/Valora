import { Bell, CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { WalletMorphSelector } from './WalletMorphSelector'

type TopBarProps = {
  periodo?: string
  alertCount?: number
  onNovoLancamento?: () => void
}

export function TopBar({
  periodo = '1A',
  alertCount = 0,
  onNovoLancamento,
}: TopBarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const fullName = user?.user_metadata?.full_name
  const initials =
    typeof fullName === 'string' && fullName.trim()
      ? fullName
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() ?? '')
          .join('')
      : (user?.email?.[0]?.toUpperCase() ?? 'S')

  return (
    <header className="relative z-40 hidden h-[58px] shrink-0 items-center justify-between bg-[#131313] px-10 md:flex">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-7">
        <div className="absolute inset-0 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131313] via-[#131313]/60 to-transparent" />
      </div>
      {/* ── Filtros globais ── */}
      <div className="flex items-center gap-3">
        {/* Seletor de carteira */}
        <WalletMorphSelector
          onNewWallet={() => navigate('/conta')}
          onManageWallets={() => navigate('/conta')}
        />

        {/* Seletor de período */}
        <button
          type="button"
          className="
            flex items-center gap-2 rounded-full
            border border-white/[0.1] bg-[#393939]
            px-4 py-2 text-[13px] font-medium text-white
            transition-colors hover:bg-white/[0.12]
          "
        >
          <CalendarDays className="h-3.5 w-3.5 text-white/70" strokeWidth={1.8} aria-hidden="true" />
          {periodo}
          <ChevronDown className="h-3 w-3 text-[#BBBBBB]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* ── Ações globais ── */}
      <div className="flex items-center gap-3">
        {/* Sino */}
        <Link
          to="/alertas"
          aria-label={alertCount > 0 ? `Abrir alertas (${alertCount} novos)` : 'Abrir alertas'}
          className="
              relative grid h-9 w-9 place-items-center rounded-full
              bg-[#393939]
              transition-colors hover:bg-white/[0.12]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple
            "
        >
          <Bell className="h-4 w-4 text-white" strokeWidth={1.8} aria-hidden="true" />
          {alertCount > 0 && (
            <span
              aria-hidden="true"
              className="
                  absolute -right-0.5 -top-0.5
                  flex h-4 w-4 items-center justify-center
                  rounded-full bg-[#F765A3]
                  text-[9px] font-semibold text-white
                  ring-[1.5px] ring-[#131313]
                "
            >
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>

        {/* Novo lançamento */}
        <button
          type="button"
          onClick={onNovoLancamento}
          className="
            flex items-center gap-2 rounded-full
            border border-white/[0.1] bg-[#393939]
            px-4 py-2 text-[13px] font-medium text-white
            transition-colors hover:bg-white/[0.12]
          "
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          Lançamento
        </button>

        {/* Avatar */}
        <button
          type="button"
          aria-label="Perfil"
          className="
            grid h-8 w-8 place-items-center rounded-full
            bg-[#A66AF4]
            text-[13px] font-medium text-white
            transition-opacity hover:opacity-80
          "
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
