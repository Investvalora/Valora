import { Plus } from 'lucide-react'
import { AlertBell } from './AlertBell'
import { WalletMorphSelector } from './WalletMorphSelector'

type TopBarProps = {
  alertCount?: number
  onNovoLancamento?: () => void
}

export function TopBar({
  alertCount = 0,
  onNovoLancamento,
}: TopBarProps) {
  return (
    <header className="relative z-40 hidden min-h-[58px] shrink-0 flex-wrap items-center justify-between gap-2 bg-[#131313] px-4 py-4 pt-[max(0.5rem,env(safe-area-inset-top))] md:flex md:px-10 md:py-2">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#131313]/60 to-transparent" />
      </div>
      {/* ── Filtros globais ── */}
      <div className="relative flex max-w-full flex-wrap items-center gap-3">
        {/* Seletor de carteira */}
        <div className="hidden md:block">
          <WalletMorphSelector />
        </div>


      </div>

      {/* ── Ações globais ── */}
      <div className="hidden items-center gap-3 md:flex">
        {/* Sino */}
        <AlertBell count={alertCount} />

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

      </div>
    </header>
  )
}
