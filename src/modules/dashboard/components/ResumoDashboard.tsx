import { lazy, Suspense, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import { assetClassColor, assetClassLabel } from '../../portfolio/composition'
import type { AssetClassSlice } from '../../portfolio/types'

const WealthBarChart = lazy(() => import('./WealthBarChart'))
const CompositionPieChart = lazy(() => import('../../portfolio/components/CompositionPieChart'))

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const MISSING = '—'

function fmtBRL(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return MISSING
  return brlFormatter.format(v)
}

function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return MISSING
  return `${pctFormatter.format(v)}%`
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Gráfico do dashboard não pôde ser renderizado.', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center rounded-lg border border-dark-border h-[280px]">
          <p className="text-sm text-gray-400">Gráfico indisponível.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Card KPI ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  title,
  main,
  mainColor = 'text-white',
  badge,
  sub1Label,
  sub1Value,
  sub2Label,
  sub2Value,
}: {
  icon: string
  title: string
  main: string
  mainColor?: string
  badge?: { label: string; up: boolean } | null
  sub1Label?: string
  sub1Value?: string
  sub2Label?: string
  sub2Value?: string
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">{icon}</span>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={`text-2xl font-bold tabular-nums ${mainColor}`}>{main}</p>
        {badge && (
          <span className={`text-sm font-semibold tabular-nums ${badge.up ? 'text-green-400' : 'text-red-400'}`}>
            {badge.label} {badge.up ? '↑' : '↓'}
          </span>
        )}
      </div>
      {(sub1Label || sub2Label) && (
        <div className="flex gap-4 flex-wrap">
          {sub1Label && (
            <div>
              <p className="text-xs text-gray-500">{sub1Label}</p>
              <p className="text-sm font-medium text-gray-300 tabular-nums">{sub1Value}</p>
            </div>
          )}
          {sub2Label && (
            <div>
              <p className="text-xs text-gray-500">{sub2Label}</p>
              <p className="text-sm font-medium text-green-400 tabular-nums">{sub2Value}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Legenda da pizza ─────────────────────────────────────────────────────────

function PieLegend({ slices }: { slices: AssetClassSlice[] }) {
  const pct = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (slices.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sem dados de composição.</p>
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {slices.map((slice) => (
        <li key={slice.type} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ background: assetClassColor(slice.type) }}
              aria-hidden="true"
            />
            <span className="text-gray-300 truncate">{assetClassLabel(slice.type)}</span>
          </span>
          <span className="font-medium text-white tabular-nums flex-shrink-0">
            {pct.format(slice.percent)}%
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function ResumoDashboard() {
  const {
    totalPatrimonioBRL,
    valorInvestidoBRL,
    ganhoCapitalBRL,
    proventos12mBRL,
    variacaoPct,
    monthlySeries,
    compositionSlices,
    isLoading,
    isError,
    refetch,
  } = useDashboard()

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-400 animate-pulse">Carregando resumo…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8">
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3 max-w-md">
          <p className="text-red-400 font-medium">Erro ao carregar dados do resumo.</p>
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const variacao = variacaoPct !== null ? {
    label: fmtPct(variacaoPct),
    up: variacaoPct >= 0,
  } : null

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Cards KPI ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {/* Patrimônio total */}
        <KpiCard
          icon="🔄"
          title="Patrimônio total"
          main={fmtBRL(totalPatrimonioBRL)}
          badge={variacao}
          sub1Label="Valor investido"
          sub1Value={fmtBRL(valorInvestidoBRL)}
        />

        {/* Lucro total */}
        <KpiCard
          icon="💡"
          title="Lucro total"
          main={fmtBRL(ganhoCapitalBRL)}
          mainColor={
            ganhoCapitalBRL === null
              ? 'text-white'
              : ganhoCapitalBRL >= 0
                ? 'text-green-400'
                : 'text-red-400'
          }
          sub1Label="Ganho de Capital"
          sub1Value={fmtBRL(ganhoCapitalBRL)}
          sub2Label="Dividendos Recebidos"
          sub2Value={fmtBRL(proventos12mBRL)}
        />

        {/* Proventos Recebidos (12M) */}
        <KpiCard
          icon="📋"
          title="Proventos Recebidos (12M)"
          main={fmtBRL(proventos12mBRL)}
          sub1Label="Total"
          sub1Value={fmtBRL(proventos12mBRL)}
        />

        {/* Rentabilidade */}
        <KpiCard
          icon="📊"
          title="Rentabilidade (12M)"
          main={variacaoPct !== null ? fmtPct(variacaoPct) : MISSING}
          mainColor={
            variacaoPct === null
              ? 'text-white'
              : variacaoPct >= 0
                ? 'text-green-400'
                : 'text-red-400'
          }
        />
      </div>

      {/* ── Gráfico + Pizza ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Gráfico de barras — 2/3 da largura */}
        <div className="lg:col-span-2 rounded-xl border border-dark-border bg-dark-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Evolução do Patrimônio</h2>
            <span className="text-xs text-gray-500">Últimos 12 Meses</span>
          </div>

          {monthlySeries.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-sm text-gray-400">
                Sem histórico de preços para o período selecionado.
              </p>
            </div>
          ) : (
            <ChartErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[280px]">
                    <p className="text-sm text-gray-400 animate-pulse">Carregando gráfico…</p>
                  </div>
                }
              >
                <WealthBarChart data={monthlySeries} />
              </Suspense>
            </ChartErrorBoundary>
          )}
        </div>

        {/* Pizza — 1/3 da largura */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Ativos na Carteira</h2>
          </div>

          {compositionSlices.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-gray-400">Sem posições avaliadas.</p>
            </div>
          ) : (
            <>
              {/* Pizza */}
              <div aria-hidden="true">
                <ChartErrorBoundary>
                  <Suspense fallback={<div className="h-[220px]" />}>
                    <CompositionPieChart
                      slices={compositionSlices}
                      formatBRL={fmtBRL}
                      formatPercent={fmtPct}
                    />
                  </Suspense>
                </ChartErrorBoundary>
              </div>

              {/* Legenda */}
              <PieLegend slices={compositionSlices} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
