import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { PeriodSelector } from '../../wealth/components/PeriodSelector'
import { DividendsTable } from './DividendsTable'
import { useDividends, useHasPositions } from '../hooks/useDividends'
import { buildMonthlyBars, filterAndSort, sumTotalValue } from '../utils/dividendCalculations'
import { downloadDividendsCsv } from '../export/dividendsCsv'
import type { DividendPeriod, DividendSort, DividendSortColumn } from '../types'
import type { WealthPeriod } from '../../wealth/types'

const DividendsBarChart = lazy(() => import('./DividendsBarChart'))

/** Períodos disponíveis na tela de Proventos. */
const DIVIDEND_PERIODS: WealthPeriod[] = ['6M', '1A', 'Tudo']

const DEFAULT_SORT: DividendSort = { column: 'ex_date', direction: 'desc' }

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Error boundary para o gráfico de barras: chunk que não carrega não
 * derruba a página — mesmo padrão de PatrimonioPage e CompositionCard.
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
    console.warn('Gráfico de proventos não pôde ser renderizado.', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dark-border">
          <p className="text-sm text-gray-400">Gráfico indisponível.</p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Tela de Proventos — rota `/proventos`.
 *
 * Orquestra:
 * - Seletor de período (6M / 1A / Tudo)
 * - Gráfico de barras mensal lazy-loaded
 * - Tabela filtrável e ordenável
 * - Destaque do total do período
 * - Exportação CSV
 *
 * Estados tratados: loading, erro, sem posições, sem dividendos no período.
 */
export function ProventosPage() {
  const [period, setPeriod] = useState<DividendPeriod>('6M')
  const [sort, setSort] = useState<DividendSort>(DEFAULT_SORT)
  const [tickerFilter, setTickerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { hasPositions, isLoading: isPositionsLoading } = useHasPositions()
  const { rows, isLoading, isError, error, refetch, availableTypes } = useDividends(period)

  // Barras mensais para o gráfico (antes dos filtros da tabela)
  const monthlyBars = useMemo(() => buildMonthlyBars(rows), [rows])

  // Linhas filtradas e ordenadas para a tabela
  const filteredRows = useMemo(
    () => filterAndSort(rows, tickerFilter, typeFilter, sort),
    [rows, tickerFilter, typeFilter, sort],
  )

  // Total calculado sobre as linhas visíveis (pós-filtro)
  const periodTotal = useMemo(() => sumTotalValue(filteredRows), [filteredRows])

  function handleSortChange(column: DividendSortColumn) {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  function handlePeriodChange(newPeriod: WealthPeriod) {
    // WealthPeriod é compatível com DividendPeriod para os valores exibidos
    setPeriod(newPeriod as DividendPeriod)
  }

  // --- Estado: carregando ---
  if (isLoading || isPositionsLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Proventos</h1>
        <p className="text-gray-400 animate-pulse">Carregando proventos…</p>
      </div>
    )
  }

  // --- Estado: erro ---
  if (isError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Proventos</h1>
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3"
        >
          <p className="text-red-400 font-medium">Erro ao carregar proventos</p>
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
        <h1 className="text-2xl font-bold text-white mb-6">Proventos</h1>
        <div className="rounded-xl border border-dark-border bg-dark-surface p-10 text-center">
          <p className="text-gray-400 text-lg">Nenhuma posição cadastrada</p>
          <p className="text-gray-500 text-sm mt-2">
            Adicione ativos na carteira para visualizar os proventos recebidos.
          </p>
        </div>
      </div>
    )
  }

  // --- Tela completa ---
  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Proventos</h1>
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          periods={DIVIDEND_PERIODS}
        />
      </div>

      {/* Total do período em destaque */}
      <div className="rounded-xl border border-dark-border bg-dark-surface px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
            {tickerFilter || typeFilter ? 'Total recebido (filtrado)' : 'Total recebido no período'}
          </p>
          <p className="text-3xl font-bold text-white tabular-nums">
            {brlFormatter.format(periodTotal)}
          </p>
        </div>
        <button
          type="button"
          disabled={filteredRows.length === 0}
          onClick={() => downloadDividendsCsv(filteredRows)}
          className="
            rounded-lg border border-dark-border bg-dark-bg px-4 py-2 text-sm font-medium
            text-gray-200 hover:bg-dark-surface hover:text-white transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        >
          Exportar CSV
        </button>
      </div>

      {/* Gráfico de barras mensal */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          Proventos por mês
        </h2>
        <ChartErrorBoundary>
          <Suspense
            fallback={
              <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm animate-pulse">
                Carregando gráfico…
              </div>
            }
          >
            <DividendsBarChart data={monthlyBars} />
          </Suspense>
        </ChartErrorBoundary>
      </div>

      {/* Tabela */}
      <DividendsTable
        rows={filteredRows}
        totalValue={periodTotal}
        sort={sort}
        tickerFilter={tickerFilter}
        typeFilter={typeFilter}
        availableTypes={availableTypes}
        onSortChange={handleSortChange}
        onTickerFilterChange={setTickerFilter}
        onTypeFilterChange={setTypeFilter}
      />
    </div>
  )
}
