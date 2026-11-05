import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { deriveComposition } from '../../portfolio/composition'
import { useAtivosValuation } from '../../ativos/hooks/useAtivosValuation'
import { useWealthHistory } from '../hooks/useWealthHistory'
import { useWallets } from '../../portfolio/hooks/useWallets'
import type { WealthPeriod } from '../types'
import { PeriodSelector } from './PeriodSelector'
import { CompositionCards } from './CompositionCards'

/**
 * Lazy-load do gráfico de linha (spec AC: "usa React.lazy").
 * Recharts é pesado — mantido fora do bundle inicial da página.
 */
const WealthLineChart = lazy(() => import('./WealthLineChart'))

/**
 * Error boundary para o gráfico: chunk que não baixa não derruba a página.
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
    console.warn('Gráfico de patrimônio não pôde ser renderizado.', error, info.componentStack)
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

export function PatrimonioPage() {
  const [period, setPeriod] = useState<WealthPeriod>('1M')
  const { selectedWallet } = useWallets()

  const {
    series,
    isLoading,
    isError,
    hasPositions: hasHistoricalPositions,
    hasHistory,
    usdRateIsFallback,
    refetch,
  } = useWealthHistory(period, selectedWallet?.id ?? '')

  const valuation = useAtivosValuation(selectedWallet?.id ?? '', true)
  const hasPositions = hasHistoricalPositions || valuation.assetCount > 0
  const composition = useMemo(() =>
    !valuation.isLoading && !valuation.isError && valuation.complete
      ? deriveComposition(valuation.compositionRows, valuation.totalBRL)
      : null,
  [valuation.isLoading, valuation.isError, valuation.complete, valuation.compositionRows, valuation.totalBRL])

  // Mensagens de estado vazio distintas (spec §I/O & Edge-Case Matrix)
  const emptyMessage = useMemo(() => {
    if (!hasPositions) return 'Nenhuma posição cadastrada.'
    if (series.length === 0 || !hasHistory)
      return 'Dados históricos indisponíveis para o período.'
    // Série existe mas todos os pontos são null: nenhum ticker tinha cotação
    // em qualquer dia do período. Exibir gráfico vazio sem explicação confunde.
    if (series.every((p) => p.value === null))
      return 'Sem cotações disponíveis para os ativos da carteira no período selecionado.'
    return null
  }, [hasPositions, hasHistory, series])

  const showChart = !isLoading && !emptyMessage && series.length > 0

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patrimônio</h1>
          <p className="mt-1 text-sm text-gray-400">
            {isLoading
              ? 'Carregando...'
              : hasPositions
                ? 'Evolução, composição e exposição da carteira'
                : 'Nenhuma posição cadastrada'}
          </p>
        </div>

        {/* Seletor só aparece quando há posições */}
        {hasPositions && !isLoading && (
          <PeriodSelector value={period} onChange={setPeriod} />
        )}
      </header>

      {/* Erro de fetch */}
      {isError && (
        <div
          className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="text-sm text-red-400">
            Não foi possível carregar os dados de patrimônio.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Gráfico de evolução */}
      <section
        aria-label="Evolução do patrimônio"
        className="mb-6 rounded-lg border border-dark-border bg-dark-surface p-6"
      >
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Evolução patrimonial
        </h2>

        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <p className="text-sm text-gray-400">Carregando gráfico...</p>
          </div>
        ) : emptyMessage ? (
          <div className="flex h-[280px] items-center justify-center">
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          </div>
        ) : showChart ? (
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-sm text-gray-400">Carregando gráfico...</p>
                </div>
              }
            >
              <WealthLineChart data={series} />
            </Suspense>
          </ChartErrorBoundary>
        ) : null}
      </section>

      {!isLoading && !composition && valuation.isError && (
        <p role="alert" className="mb-6 text-sm text-red-400">Não foi possível carregar a composição atual. Tente novamente ao recarregar a página.</p>
      )}
      {!isLoading && !valuation.isLoading && !valuation.isError && !valuation.complete && (
        <p role="status" className="mb-6 text-sm text-gray-400">Composição atual indisponível: faltam cotações ou câmbio.</p>
      )}
      {/* Cards de composição — só quando há composição calculável */}
      {!isLoading && composition && composition.slices.length > 0 && (
        <CompositionCards
          composition={composition}
          isLoading={isLoading}
          usdRateIsFallback={usdRateIsFallback}
        />
      )}

      {/* Estado sem posições */}
      {!isLoading && !hasPositions && !isError && (
        <div className="rounded-lg border border-dark-border bg-dark-surface p-8 text-center">
          <p className="text-gray-400">
            Cadastre posições na{' '}
            <a href="/ativos" className="text-blue-400 underline hover:text-blue-300">
              Ativos
            </a>{' '}
            para visualizar a evolução do patrimônio.
          </p>
        </div>
      )}
    </div>
  )
}
