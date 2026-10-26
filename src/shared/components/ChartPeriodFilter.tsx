import { CalendarDays } from 'lucide-react'
import { CHART_PERIODS, useChartPeriod, type ChartPeriod } from '../stores/useChartPeriod'

export function ChartPeriodFilter() {
  const { period, from, to, setPeriod, setFrom, setTo } = useChartPeriod()
  return <div className="min-w-0">
        {/* Seletor de período */}
        <label
          className="
            flex min-h-11 items-center gap-2 rounded-full
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
          <div role="group" aria-label="Intervalo personalizado" className="mt-2 flex max-w-full flex-wrap gap-3 rounded-xl border border-white/15 bg-[#262626] p-3 shadow-xl">
            <label className="flex flex-col gap-1 text-xs text-white/60">De
              <input aria-label="Data inicial do gráfico" type="date" value={from} max={to || undefined} onInput={(event) => setFrom(event.currentTarget.value)} onChange={(event) => setFrom(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#393939] px-2 text-white" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">Até
              <input aria-label="Data final do gráfico" type="date" value={to} min={from || undefined} onInput={(event) => setTo(event.currentTarget.value)} onChange={(event) => setTo(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#393939] px-2 text-white" />
            </label>
          </div>
        )}
  </div>
}
