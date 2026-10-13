/**
 * DesempenhoVisaoGeral — sub-rota /desempenho/visao-geral.
 * Combina rentabilidade, proventos mensais, tabela mensal e top pagadores.
 */
import { lazy, Suspense, useMemo } from 'react'
import { PanelCard } from '../../../shared/components/PanelCard'
import { KpiPillBar } from '../../../shared/components/KpiPillBar'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { TabelaMensal } from './TabelaMensal'
import { useDividends } from '../../dividends/hooks/useDividends'
import { buildMonthlyBars } from '../../dividends/utils/dividendCalculations'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useWallets } from '../../portfolio/hooks/useWallets'

const PerformanceLineChart = lazy(
  () => import('../../performance/components/PerformanceLineChart'),
)
const DividendsBarChart = lazy(
  () => import('../../dividends/components/DividendsBarChart'),
)

function LoadingChart() {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <span className="animate-pulse text-sm text-white/40">Carregando…</span>
    </div>
  )
}

function LoadingChartSm() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <span className="animate-pulse text-sm text-white/40">Carregando…</span>
    </div>
  )
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

function fmtBRL(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return brlFormatter.format(v)
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

export function DesempenhoVisaoGeral() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  const { portfolioSeries, benchmarkSeries, summary, monthlyTableData, isLoading } =
    usePerformance('1A')

  const dashboard = useDashboard(walletId)

  const { rows: divRows, isLoading: divLoading } = useDividends('1A')

  const monthlyBars = useMemo(() => buildMonthlyBars(divRows), [divRows])

  const topPagadores = useMemo(
    () => [...divRows].sort((a, b) => b.total_value - a.total_value).slice(0, 3),
    [divRows],
  )

  // KPI: rentabilidade total
  const rentPct = summary.portfolioReturnPct
  const rentFormatted = rentPct != null ? fmtPct(rentPct * 100) : '—'
  const rentPositive = rentPct != null ? rentPct >= 0 : null

  return (
    <div className="flex flex-col gap-5">
      {/* ── Cabeçalho ── */}
      <h2 className="text-[18px] font-semibold text-white">Visão Geral</h2>

      {/* ── KPI pills ── */}
      <KpiPillBar
        items={[
          {
            label: 'Rentabilidade total',
            value: rentFormatted,
            colorClass:
              rentPositive === null
                ? 'text-white'
                : rentPositive
                  ? 'text-nf-green'
                  : 'text-nf-pink',
          },
          {
            label: 'Lucro',
            value: fmtBRL(dashboard.lucroTotalBRL),
          },
          {
            label: 'Proventos 12M',
            value: fmtBRL(dashboard.proventos12mBRL),
          },
          {
            label: 'Patrimônio atual',
            value: fmtBRL(dashboard.totalPatrimonioBRL),
          },
        ]}
      />

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Coluna esquerda */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Gráfico de rentabilidade */}
          <PanelCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[14px] font-semibold text-white">
                Rentabilidade comparada
              </h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="inline-block h-2 w-6 rounded-sm bg-[#3b82f6]" />
                  Carteira
                </span>
                {benchmarkSeries.map((s) => (
                  <span
                    key={s.label}
                    className="flex items-center gap-1.5 text-[11px] text-white/60"
                  >
                    <span
                      className="inline-block h-2 w-6 rounded-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            {isLoading ? (
              <LoadingChart />
            ) : (
              <Suspense fallback={<LoadingChart />}>
                <PerformanceLineChart series={[portfolioSeries, ...benchmarkSeries]} />
              </Suspense>
            )}
          </PanelCard>

          {/* Gráfico de proventos mensais */}
          <PanelCard>
            <h3 className="mb-4 text-[14px] font-semibold text-white">
              Proventos mensais (12M)
            </h3>
            {divLoading ? (
              <LoadingChartSm />
            ) : (
              <Suspense fallback={<LoadingChartSm />}>
                <DividendsBarChart data={monthlyBars} />
              </Suspense>
            )}
          </PanelCard>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-5 lg:col-span-1">
          {/* Tabela mensal */}
          <PanelCard>
            <h3 className="mb-4 text-[14px] font-semibold text-white">
              Rentabilidade mensal
            </h3>
            {isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <span className="animate-pulse text-sm text-white/40">Carregando…</span>
              </div>
            ) : (
              <TabelaMensal rows={monthlyTableData} />
            )}
          </PanelCard>

          {/* Top pagadores */}
          <PanelCard>
            <h3 className="mb-4 text-[14px] font-semibold text-white">
              Top pagadores (12M)
            </h3>
            {divLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            ) : topPagadores.length === 0 ? (
              <p className="text-center text-[13px] text-white/40">
                Sem proventos no período
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {topPagadores.map((row) => (
                  <div
                    key={row.ticker}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5"
                  >
                    <span className="text-[13px] font-semibold text-white">
                      {row.ticker}
                    </span>
                    <span className="text-[13px] font-medium text-nf-green">
                      {fmtBRL(row.total_value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  )
}
