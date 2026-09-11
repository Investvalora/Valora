import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { deriveComposition } from '../../portfolio/composition'
import type { PositionRow } from '../../portfolio/types'
import { useWealthHistory } from '../hooks/useWealthHistory'
import type { WealthPeriod, PositionSnapshot } from '../types'
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

/**
 * Constrói `PositionRow[]` mínimos para `deriveComposition`, usando o último
 * preço conhecido de cada ticker (do `lastPricesMap`).
 *
 * `deriveComposition` só lê `row.marketValueBRL`, `row.ticker` e `row.type` —
 * os demais campos recebem sentinelas (null / NaN / false).
 *
 * Retorna também o total em BRL para que os percentuais fechem em 100%.
 */
function buildCompositionInput(
  positions: PositionSnapshot[],
  lastPricesMap: Map<string, number>,
  usdRate: number,
): { rows: PositionRow[]; totalBRL: number } {
  let totalBRL = 0

  const rows: PositionRow[] = positions.map((pos) => {
    const close = lastPricesMap.get(pos.ticker)
    let marketValueBRL: number | null = null

    if (close !== undefined && Number.isFinite(close)) {
      const priceInBRL = pos.currency === 'USD' ? close * usdRate : close
      marketValueBRL = priceInBRL * pos.quantity
      if (Number.isFinite(marketValueBRL)) {
        totalBRL += marketValueBRL
      } else {
        marketValueBRL = null
      }
    }

    return {
      id: pos.ticker,
      ticker: pos.ticker,
      name: null,
      currency: pos.currency,
      type: pos.type,
      quantity: pos.quantity,
      averagePrice: 0,
      acquisitionDate: '',
      quote: null,
      quotePrice: Number.NaN,
      marketValueBRL,
      weightPercent: null,
      changePercent: null,
      isStaleQuote: false,
      usesUSDRate: pos.currency === 'USD',
    }
  })

  return { rows, totalBRL }
}

export function PatrimonioPage() {
  const [period, setPeriod] = useState<WealthPeriod>('1M')

  const {
    series,
    isLoading,
    isError,
    hasPositions,
    hasHistory,
    usdRateIsFallback,
    refetch,
    positions,
    lastPricesMap,
    usdRate,
  } = useWealthHistory(period)

  /**
   * Composição derivada do último preço conhecido por ticker.
   *
   * Usa `deriveComposition` — a mesma função da tela Carteira — para que as
   * classes, cores e labels sejam idênticos (spec AC "cards de composição").
   */
  const compositionInput = useMemo(
    () =>
      positions.length > 0
        ? buildCompositionInput(positions, lastPricesMap, usdRate)
        : null,
    [positions, lastPricesMap, usdRate],
  )

  const composition = useMemo(
    () =>
      compositionInput
        ? deriveComposition(compositionInput.rows, compositionInput.totalBRL)
        : null,
    [compositionInput],
  )

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
            <a href="/carteira" className="text-blue-400 underline hover:text-blue-300">
              Carteira
            </a>{' '}
            para visualizar a evolução do patrimônio.
          </p>
        </div>
      )}
    </div>
  )
}
