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
    usePerformance('1A', walletId)

  const dashboard = useDashboard(walletId)

  const { rows: divRows, isLoading: divLoading } = useDividends('1A', walletId)

  const monthlyBars = useMemo(() => buildMonthlyBars(divRows), [divRows])

  const topPagadores = useMemo(
    () => [...divRows].sort((a, b) => b.total_value - a.total_value).slice(0, 3),
    [divRows],
  )

  // KPI: rentabilidade total
  const rentPct = summary.portfolioReturnPct
  const rentFormatted = rentPct != null ? fmtPct(rentPct * 100) : '—'
  const rentPositive = rentPct != null ? rentPct >= 0 : null

  // KPI mobile: último mês disponível
  const lastMonthRow = useMemo(() => {
    if (monthlyTableData.length === 0) return null
    // rows são ordenadas por ano decrescente; pegar o primeiro ano e o último mês disponível
    const firstRow = monthlyTableData[0]
    const sortedMonths = [...firstRow.months.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const last = sortedMonths[sortedMonths.length - 1]
    return last ? { val: last[1] } : null
  }, [monthlyTableData])
  const lastMonthFormatted = lastMonthRow ? fmtPct(lastMonthRow.val * 100) : '—'
  const lastMonthIsPositive = lastMonthRow ? lastMonthRow.val >= 0 : false

  // KPI mobile: vs CDI
  const cdiIsAbove =
    summary.portfolioReturnPct != null &&
    summary.cdiReturnPct != null &&
    summary.portfolioReturnPct > summary.cdiReturnPct
  const cdiLabel = summary.portfolioReturnPct == null || summary.cdiReturnPct == null
    ? '—'
    : cdiIsAbove ? 'Acima' : 'Abaixo'

  return (
    <div className="flex flex-col gap-5">
      {/* ── Cabeçalho ── */}
      <h2 className="text-[18px] font-semibold text-white">Visão Geral</h2>

      {/* ── KPI pills ── */}
      {/* Mobile KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {[
          {
            label: 'Rent. total',
            value: rentFormatted,
            green: rentPositive === true,
            pink: rentPositive === false,
          },
          {
            label: 'Último mês',
            value: lastMonthFormatted,
            green: lastMonthIsPositive,
            pink: !lastMonthIsPositive && lastMonthRow != null,
          },
          {
            label: 'Proventos 12M',
            value: fmtBRL(dashboard.proventos12mBRL),
            green: false,
            pink: false,
          },
          {
            label: 'vs CDI',
            value: cdiLabel,
            green: cdiIsAbove,
            pink: !cdiIsAbove && cdiLabel !== '—',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[10px] border border-white/[0.08] bg-[#1b1b1b] px-3 py-2.5"
          >
            <p className="text-[10px] text-[#8f8f8f]">{kpi.label}</p>
            <p
              className={`text-[16px] font-medium ${
                kpi.green ? 'text-nf-green' : kpi.pink ? 'text-nf-pink' : 'text-white'
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
      {/* Desktop KpiPillBar */}
      <div className="hidden md:block">
        <KpiPillBar
          items={[
            {
              label: 'Rentabilidade (12M)',
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
      </div>

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
