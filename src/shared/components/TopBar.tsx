import { Bell, CalendarDays, ChevronDown, Plus } from 'lucide-react'
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
    <header className="relative z-40 flex h-[58px] shrink-0 items-center justify-between px-10">
      {/* ── Filtros globais ── */}
      <div className="flex items-center gap-3">
        {/* Seletor de carteira */}
        <WalletMorphSelector />

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
        <div className="relative">
          <button
            type="button"
            aria-label={`${alertCount} alertas`}
            className="
              grid h-9 w-9 place-items-center rounded-full
              bg-[#393939]
              transition-colors hover:bg-white/[0.12]
            "
          >
            <Bell className="h-4 w-4 text-white" strokeWidth={1.8} aria-hidden="true" />
          </button>
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
        </div>

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
