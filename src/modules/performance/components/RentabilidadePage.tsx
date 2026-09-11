import { lazy, Suspense, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { PeriodSelector } from '../../wealth/components/PeriodSelector'
import { usePerformance } from '../hooks/usePerformance'
import { AssetReturnTable } from './AssetReturnTable'
import type { PerformancePeriod } from '../types'
import type { WealthPeriod } from '../../wealth/types'

const PerformanceLineChart = lazy(() => import('./PerformanceLineChart'))

const DEFAULT_PERIOD: PerformancePeriod = '1A'

const pctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const ppFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

/**
 * Error boundary para o gráfico de linhas: chunk que não carrega não
 * derruba a página — mesmo padrão de PatrimonioPage e ProventosPage.
 */
class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Gráfico de rentabilidade não pôde ser renderizado.', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[280px] items-center justify-center rounded-lg border border-dark-border">
          <p className="text-sm text-gray-400">Gráfico indisponível.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Card de resumo
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string
  returnPct: number | null
  color: string
  /** Spread vs CDI em pontos percentuais (só para o card da carteira). */
  vscdipPp?: number | null
}

function SummaryCard({ label, returnPct, color, vscdipPp }: SummaryCardProps) {
  const hasReturn = returnPct !== null && Number.isFinite(returnPct)
  const isPositive = hasReturn && returnPct! >= 0

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface px-5 py-4 flex flex-col gap-1 min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          !hasReturn
            ? 'text-gray-500'
            : isPositive
              ? 'text-green-400'
              : 'text-red-400'
        }`}
      >
        {hasReturn ? `${pctFormatter.format(returnPct! * 100)}%` : '—'}
      </p>
      {vscdipPp !== undefined && vscdipPp !== null && (
        <p
          className={`text-xs tabular-nums ${vscdipPp >= 0 ? 'text-green-500' : 'text-red-400'}`}
        >
          {ppFormatter.format(vscdipPp)} pp vs CDI
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

/**
 * Tela de Rentabilidade — rota `/rentabilidade`.
 *
 * Orquestra:
 * - Seletor de período (1M / 3M / 6M / 1A / Tudo)
 * - Gráfico de linhas lazy-loaded com ChartErrorBoundary
 * - 4 cards de resumo (Carteira, CDI, IBOV, IFIX)
 * - Badge "taxa USD aproximada" quando usdRateIsFallback
 *
 * Estados tratados: loading, erro com retry, sem posições, sem histórico.
 */
export function RentabilidadePage() {
  const [period, setPeriod] = useState<PerformancePeriod>(DEFAULT_PERIOD)

  const {
    portfolioSeries,
    benchmarkSeries,
    summary,
    assetRows,
    isLoading,
    isError,
    error,
    refetch,
    hasPositions,
    hasHistory,
    usdRateIsFallback,
  } = usePerformance(period)

  function handlePeriodChange(p: WealthPeriod) {
    setPeriod(p as PerformancePeriod)
  }

  // --- Estado: carregando ---
  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Rentabilidade</h1>
        <p className="text-gray-400 animate-pulse">Carregando rentabilidade…</p>
      </div>
    )
  }

  // --- Estado: erro ---
  if (isError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Rentabilidade</h1>
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3"
        >
          <p className="text-red-400 font-medium">Erro ao carregar rentabilidade</p>
          {error && (
            <p className="text-red-300/70 text-sm font-mono">{error.message}</p>
          )}
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // --- Estado: sem posições ---
  if (!hasPositions) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Rentabilidade</h1>
        <div className="rounded-xl border border-dark-border bg-dark-surface p-10 text-center">
          <p className="text-gray-400 text-lg">Nenhuma posição cadastrada</p>
          <p className="text-gray-500 text-sm mt-2">
            Adicione ativos na{' '}
            <a href="/carteira" className="text-blue-400 underline hover:text-blue-300">
              Carteira
            </a>{' '}
            para visualizar a rentabilidade.
          </p>
        </div>
      </div>
    )
  }

  // --- Tela completa ---
  const cdiSeries  = benchmarkSeries.find((s) => s.label === 'CDI')
  const ibovSeries = benchmarkSeries.find((s) => s.label === 'IBOV')
  const ifixSeries = benchmarkSeries.find((s) => s.label === 'IFIX')

  // Todas as séries disponíveis para o gráfico (filtra séries sem pontos)
  const chartSeries = [portfolioSeries, ...benchmarkSeries].filter(
    (s) => s.points.length > 0,
  )

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Rentabilidade</h1>
          {usdRateIsFallback && (
            <span className="rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-0.5">
              taxa USD aproximada
            </span>
          )}
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Carteira"
          returnPct={summary.portfolioReturnPct}
          color="#3b82f6"
          vscdipPp={summary.vscdipPp}
        />
        <SummaryCard
          label="CDI"
          returnPct={summary.cdiReturnPct}
          color={cdiSeries?.color ?? '#22c55e'}
        />
        <SummaryCard
          label="IBOV"
          returnPct={summary.ibovReturnPct}
          color={ibovSeries?.color ?? '#eab308'}
        />
        <SummaryCard
          label="IFIX"
          returnPct={summary.ifixReturnPct}
          color={ifixSeries?.color ?? '#f97316'}
        />
      </div>

      {/* Gráfico comparativo */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          Rentabilidade acumulada (base 100)
        </h2>
        {!hasHistory ? (
          <div className="flex h-[280px] items-center justify-center text-gray-500 text-sm">
            Sem histórico de preços no período selecionado
          </div>
        ) : (
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm animate-pulse">
                  Carregando gráfico…
                </div>
              }
            >
              <PerformanceLineChart series={chartSeries} />
            </Suspense>
          </ChartErrorBoundary>
        )}
      </div>

      {/* Tabela de rentabilidade por ativo */}
      <AssetReturnTable rows={assetRows} />
    </div>
  )
}
