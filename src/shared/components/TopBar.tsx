import { Bell, CalendarDays, Plus } from 'lucide-react'
import { CHART_PERIODS, useChartPeriod, type ChartPeriod } from '../stores/useChartPeriod'
import { Link } from 'react-router-dom'
import { WalletMorphSelector } from './WalletMorphSelector'

type TopBarProps = {
  alertCount?: number
  onNovoLancamento?: () => void
}

export function TopBar({
  alertCount = 0,
  onNovoLancamento,
}: TopBarProps) {
  const { period, from, to, setPeriod, setFrom, setTo } = useChartPeriod()
  return (
    <header className="relative z-40 hidden h-[58px] shrink-0 items-center justify-between bg-[#131313] px-10 md:flex">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-7">
        <div className="absolute inset-0 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131313] via-[#131313]/60 to-transparent" />
      </div>
      {/* ── Filtros globais ── */}
      <div className="relative flex items-center gap-3">
        {/* Seletor de carteira */}
        <WalletMorphSelector />

        {/* Seletor de período */}
        <label
          className="
            flex items-center gap-2 rounded-full
            border border-white/[0.1] bg-[#393939]
            px-4 py-2 text-[13px] font-medium text-white
            transition-colors hover:bg-white/[0.12]
          "
        >
          <CalendarDays className="h-3.5 w-3.5 text-white/70" strokeWidth={1.8} aria-hidden="true" />
          <select aria-label="Período da evolução do patrimônio" value={period} onChange={(event) => setPeriod(event.target.value as ChartPeriod)} className="min-w-0 bg-[#393939] text-white outline-none">
            {CHART_PERIODS.map(([value, label]) => <option key={value} value={value}>{value === 'custom' || value === 'Tudo' ? label : value}</option>)}
          </select>
        </label>
        {period === 'custom' && (
          <div role="group" aria-label="Intervalo personalizado" className="absolute left-0 top-full mt-2 flex gap-3 rounded-xl border border-white/15 bg-[#262626] p-3 shadow-xl">
            <label className="flex flex-col gap-1 text-xs text-white/60">De
              <input aria-label="Data inicial do gráfico" type="date" value={from} max={to || undefined} onInput={(event) => setFrom(event.currentTarget.value)} onChange={(event) => setFrom(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#393939] px-2 text-white" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">Até
              <input aria-label="Data final do gráfico" type="date" value={to} min={from || undefined} onInput={(event) => setTo(event.currentTarget.value)} onChange={(event) => setTo(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#393939] px-2 text-white" />
            </label>
          </div>
        )}
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

      </div>
    </header>
  )
}
