/**
 * DesempenhoPage — tela do novo fluxo desktop
 *
 * Seções:
 * 1. 4 KPIs  — Rentabilidade total, Último mês, Proventos 12M, vs CDI
 * 2. Gráfico de linha comparativo (Carteira × CDI × IBOV × IFIX) — reutiliza PerformanceLineChart
 * 3. Tabela mês × ano — TabelaMensal (wrapper leve sobre MonthlyTableRow)
 * 4. Gráfico de barras de proventos — ProventosChart (SVG puro)
 * 5. Top 3 pagadores — ProventosTopPagadores
 */
import { lazy, Suspense, useMemo, useState } from 'react'
import { BarChart2, CalendarDays, Coins, TrendingUp } from 'lucide-react'
import { KpiCard } from '../../../shared/components/KpiCard'
import { PanelCard } from '../../../shared/components/PanelCard'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useDividends } from '../../dividends/hooks/useDividends'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { buildMonthlyBars } from '../../dividends/utils/dividendCalculations'
import type { PerformancePeriod } from '../../performance/types'
import type { DividendPeriod } from '../../dividends/types'
import { TabelaMensal } from './TabelaMensal'
import { ProventosChart } from './ProventosChart'

const PerformanceLineChart = lazy(() => import('../../performance/components/PerformanceLineChart'))

// ── helpers de formatação ──────────────────────────────────────────────────
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
function fmtBRL(v: number | null): string { return v === null || !Number.isFinite(v) ? '—' : brl.format(v) }
function fmtPct(v: number | null, isDecimal = false): string {
  if (v === null || !Number.isFinite(v)) return '—'
  const pct = isDecimal ? v * 100 : v
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

// ── seletor de período ─────────────────────────────────────────────────────
const PERF_PERIODS: PerformancePeriod[] = ['1M', '3M', '6M', '1A', 'Tudo']
const DIV_PERIODS: DividendPeriod[] = ['6M', '1A', 'Tudo']

function PeriodBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg px-3 py-1 text-[12px] font-medium transition-colors
        ${active
          ? 'bg-white/[0.12] text-white'
          : 'text-[#8F8F8F] hover:bg-white/[0.06] hover:text-white'}
      `}
    >
      {label}
    </button>
  )
}

// ── top pagadores ──────────────────────────────────────────────────────────
import type { DividendRow } from '../../dividends/types'

function TopPagadores({ rows }: { rows: DividendRow[] }) {
  // agrupar por ticker e somar total_value
  const byTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.ticker, (m.get(r.ticker) ?? 0) + r.total_value)
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [rows])

  if (byTicker.length === 0) {
    return <p className="text-[12px] text-[#8F8F8F]">Sem dados</p>
  }

  const maxVal = byTicker[0][1]

  return (
    <div className="flex flex-col gap-3">
      {byTicker.map(([ticker, total]) => (
        <div key={ticker} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-white">{ticker}</span>
            </div>
            <span className="text-[13px] font-medium text-nf-green">{fmtBRL(total)}</span>
          </div>
          {/* barra proporcional */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]">
            <div
              className="h-full rounded-full bg-nf-blue/70"
              style={{ width: `${(total / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── página ─────────────────────────────────────────────────────────────────
export function DesempenhoPage() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  const [perfPeriod, setPerfPeriod] = useState<PerformancePeriod>('1A')
  const [divPeriod, setDivPeriod] = useState<DividendPeriod>('1A')

  // hooks
  const perf = usePerformance(perfPeriod)
  const dashboard = useDashboard(walletId)
  const divs = useDividends(divPeriod)

  // proventos mensais para o gráfico
  const monthlyBars = useMemo(() => buildMonthlyBars(divs.rows), [divs.rows])

  // séries para o gráfico de linha: carteira + benchmarks
  const chartSeries = useMemo(
    () => [perf.portfolioSeries, ...perf.benchmarkSeries],
    [perf.portfolioSeries, perf.benchmarkSeries],
  )

  // KPI — último mês da tabela mensal
  const lastMonthReturn = useMemo(() => {
    if (perf.monthlyTableData.length === 0) return null
    const latestRow = perf.monthlyTableData[0] // ordenado por ano desc
    let lastVal: number | null = null
    for (const [, v] of latestRow.months) lastVal = v
    return lastVal
  }, [perf.monthlyTableData])

  // KPI — vs CDI em pontos percentuais
  const vsCDI = perf.summary.vscdipPp

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Desempenho</h1>
        <div className="ml-auto">
          <button
            type="button"
            className="
              flex items-center gap-1.5 rounded-full
              border border-white/[0.1] bg-[#393939]
              px-3.5 py-1.5 text-[13px] font-medium text-white
              transition-colors hover:bg-white/[0.12]
            "
          >
            <CalendarDays className="h-3.5 w-3.5 text-white/70" strokeWidth={1.8} aria-hidden="true" />
            {perfPeriod}
          </button>
        </div>
      </div>

      {/* ── 4 KPIs ── */}
      <div className="flex gap-4">
        <KpiCard
          label="Rentabilidade total"
          value={fmtPct(perf.summary.portfolioReturnPct, true)}
          valueColor={
            perf.summary.portfolioReturnPct === null ? 'text-white'
            : perf.summary.portfolioReturnPct >= 0 ? 'text-nf-green'
            : 'text-nf-pink'
          }
          icon={TrendingUp}
          arrowUp={perf.summary.portfolioReturnPct !== null && perf.summary.portfolioReturnPct > 0}
        />
        <KpiCard
          label="Últimos 12 meses"
          value={fmtPct(dashboard.variacaoPct)}
          valueColor={
            dashboard.variacaoPct === null ? 'text-[#8F8F8F]'
            : dashboard.variacaoPct >= 0 ? 'text-nf-green'
            : 'text-nf-pink'
          }
          icon={BarChart2}
        />
        <KpiCard
          label="Último mês"
          value={fmtPct(lastMonthReturn, true)}
          valueColor={
            lastMonthReturn === null ? 'text-[#8F8F8F]'
            : lastMonthReturn >= 0 ? 'text-nf-green'
            : 'text-nf-pink'
          }
          icon={TrendingUp}
        />
        <KpiCard
          label="Proventos recebidos (12M)"
          value={fmtBRL(dashboard.proventos12mBRL)}
          icon={Coins}
          sub={
            vsCDI !== null
              ? [{ label: 'vs CDI', value: `${vsCDI >= 0 ? '+' : ''}${vsCDI.toFixed(2)} p.p.`, valueColor: vsCDI >= 0 ? 'text-nf-green' : 'text-nf-pink' }]
              : undefined
          }
        />
      </div>

      {/* ── Gráfico de linha + Tabela mensal ── */}
      <div className="flex gap-5">
        {/* Gráfico rentabilidade comparada */}
        <PanelCard className="flex-1" padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-white/80">
              Rentabilidade comparada
            </h2>
            {/* Legenda */}
            <div className="flex items-center gap-4">
              {chartSeries.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-5 rounded"
                    style={{ background: s.color }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-[#8F8F8F]">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seletor de período */}
          <div className="mb-4 flex gap-1">
            {PERF_PERIODS.map((p) => (
              <PeriodBtn
                key={p}
                label={p}
                active={p === perfPeriod}
                onClick={() => setPerfPeriod(p)}
              />
            ))}
          </div>

          {perf.isLoading ? (
            <div className="flex h-[220px] animate-pulse items-center justify-center rounded-lg bg-white/[0.04]">
              <p className="text-[12px] text-[#8F8F8F]">Carregando…</p>
            </div>
          ) : !perf.hasPositions ? (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-[12px] text-[#8F8F8F]">Sem posições cadastradas</p>
            </div>
          ) : chartSeries[0]?.points.length > 0 ? (
            <div className="h-[220px]">
              <Suspense fallback={
                <div className="flex h-[220px] items-center justify-center">
                  <p className="text-[12px] text-[#8F8F8F] animate-pulse">Carregando gráfico…</p>
                </div>
              }>
                <PerformanceLineChart series={chartSeries} />
              </Suspense>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-[12px] text-[#8F8F8F]">Sem histórico suficiente</p>
            </div>
          )}
        </PanelCard>

        {/* Tabela mês × ano */}
        <PanelCard className="w-[440px] shrink-0 overflow-hidden" padding="p-0">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[14px] font-semibold text-white/80">
              Rentabilidade mensal
            </h2>
          </div>
          <TabelaMensal rows={perf.monthlyTableData} />
        </PanelCard>
      </div>

      {/* ── Proventos por mês + Top pagadores ── */}
      <div className="flex gap-5">
        {/* Gráfico barras de proventos */}
        <PanelCard className="flex-1" padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-white/80">Proventos por mês</h2>
            <div className="flex items-center gap-2">
              {/* seletor de período de proventos */}
              <div className="flex gap-1">
                {DIV_PERIODS.map((p) => (
                  <PeriodBtn
                    key={p}
                    label={p}
                    active={p === divPeriod}
                    onClick={() => setDivPeriod(p)}
                  />
                ))}
              </div>
            </div>
          </div>
          {divs.isLoading ? (
            <div className="flex h-[140px] animate-pulse items-center justify-center rounded-lg bg-white/[0.04]">
              <p className="text-[12px] text-[#8F8F8F]">Carregando…</p>
            </div>
          ) : (
            <ProventosChart bars={monthlyBars} />
          )}
        </PanelCard>

        {/* Top pagadores */}
        <PanelCard className="w-[300px] shrink-0" padding="p-6">
          <h2 className="mb-5 text-[14px] font-semibold text-white/80">
            Top pagadores (período)
          </h2>
          {divs.isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.06]" />
              ))}
            </div>
          ) : (
            <TopPagadores rows={divs.rows} />
          )}
        </PanelCard>
      </div>
    </div>
  )
}
