import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import { PeriodSelector } from '../../wealth/components/PeriodSelector'
import { DividendsTable } from './DividendsTable'
import { useDividends, useHasPositions, useSyncDividends } from '../hooks/useDividends'
import { buildMonthlyBars, filterAndSort, sumTotalValue } from '../utils/dividendCalculations'
import { downloadDividendsCsv } from '../export/dividendsCsv'
import { useAuth } from '../../auth/hooks/useAuth'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { useWallets } from '../../portfolio/hooks/useWallets'
import type { DividendPeriod, DividendRow, DividendSort, DividendSortColumn } from '../types'
import type { WealthPeriod } from '../../wealth/types'

const DividendsBarChart = lazy(() => import('./DividendsBarChart'))

const DIVIDEND_PERIODS: WealthPeriod[] = ['6M', '1A', 'Tudo']
const DEFAULT_SORT: DividendSort = { column: 'ex_date', direction: 'desc' }

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlLong = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const qtyFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 })
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

function formatExDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d)
}

// ── Error boundary ────────────────────────────────────────────────────────────

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

// ── Card de provento no mobile ────────────────────────────────────────────────

function DividendCardMobile({ row }: { row: DividendRow }) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a] px-4 py-3.5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-white">{row.ticker}</span>
          {row.type && (
            <span className="rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {row.type}
            </span>
          )}
        </div>
        <span className="text-[15px] font-semibold text-white tabular-nums">
          {brlFormatter.format(row.total_value)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-zinc-500">Data com</p>
          <p className="mt-0.5 font-medium text-zinc-200">{formatExDate(row.ex_date)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Valor/cota</p>
          <p className="mt-0.5 font-medium text-zinc-200">{brlLong.format(row.value_per_share)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Quantidade</p>
          <p className="mt-0.5 font-medium text-zinc-200">{qtyFmt.format(row.quantity)}</p>
        </div>
      </div>
    </div>
  )
}

// ── ProventosPage ─────────────────────────────────────────────────────────────

export function ProventosPage() {
  const [period, setPeriod] = useState<DividendPeriod>('1A')
  const [sort, setSort] = useState<DividendSort>(DEFAULT_SORT)
  const [tickerFilter, setTickerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''
  const { hasPositions, isLoading: isPositionsLoading } = useHasPositions()
  const { rows, isLoading, isError, error, refetch, availableTypes } = useDividends(period, walletId)
  const syncDividends = useSyncDividends()

  const monthlyBars = useMemo(() => buildMonthlyBars(rows), [rows])
  const filteredRows = useMemo(
    () => filterAndSort(rows, tickerFilter, typeFilter, sort),
    [rows, tickerFilter, typeFilter, sort],
  )
  const periodTotal = useMemo(() => sumTotalValue(filteredRows), [filteredRows])

  // Estatísticas para o mobile
  const { avgMonthly, maxMonthly, maxMonthKey } = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const r of filteredRows) {
      if (!r.ex_date) continue
      const key = r.ex_date.slice(0, 7)
      byMonth.set(key, (byMonth.get(key) ?? 0) + r.total_value)
    }
    const values = [...byMonth.values()]
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
    let maxKey = ''
    let maxVal = -Infinity
    for (const [k, v] of byMonth.entries()) {
      if (v > maxVal) { maxVal = v; maxKey = k }
    }
    return { avgMonthly: avg, maxMonthly: maxVal > 0 ? maxVal : 0, maxMonthKey: maxKey }
  }, [filteredRows])

  function handleSortChange(column: DividendSortColumn) {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  function handlePeriodChange(newPeriod: WealthPeriod) {
    setPeriod(newPeriod as DividendPeriod)
  }

  const fullName = user?.user_metadata?.full_name
  const initial = (
    typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()[0]
      : user?.email?.[0] ?? 'S'
  ).toUpperCase()

  // ── Estado: carregando ───────────────────────────────────────────────────
  if (isLoading || isPositionsLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Proventos</h1>
        <p className="text-gray-400 animate-pulse">Carregando proventos…</p>
      </div>
    )
  }

  // ── Estado: erro ─────────────────────────────────────────────────────────
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
            className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── Estado: sem posições ─────────────────────────────────────────────────
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

  // ── Layout mobile ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/conta"
            aria-label="Minha conta"
            className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#a66af4] text-[14px] font-medium text-white"
          >
            {initial}
          </Link>
          <button
            type="button"
            onClick={() => syncDividends.mutate()}
            disabled={syncDividends.isPending}
            className="flex items-center gap-2 rounded-full bg-[#393939] px-4 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-[#454545] disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncDividends.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
            {syncDividends.isPending ? 'Atualizando…' : 'Atualizar proventos'}
          </button>
        </div>

        {/* Título */}
        <div>
          <h1 className="text-[26px] font-semibold text-white">Proventos</h1>
          <p className="text-[11px] text-[#8f8f8f]">Dividendos, JCP e rendimentos recebidos</p>
        </div>

        {/* Seletor de período */}
        <PeriodSelector value={period} onChange={handlePeriodChange} periods={DIVIDEND_PERIODS} />

        {/* Feedback do sync */}
        {syncDividends.isSuccess && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-xs text-green-300" role="status">
            ✓ {syncDividends.data.inserted} registro{syncDividends.data.inserted !== 1 ? 's' : ''} sincronizado{syncDividends.data.inserted !== 1 ? 's' : ''}
          </p>
        )}

        {/* Total do período */}
        <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a] px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-zinc-500">
                {tickerFilter || typeFilter ? 'Total recebido (filtrado)' : 'Total recebido no período'}
              </p>
              <p className="mt-1 text-[28px] font-bold tabular-nums text-white">
                {brlFormatter.format(periodTotal)}
              </p>
            </div>
            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={() => downloadDividendsCsv(filteredRows)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#242424] px-3 py-2 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a] px-4 py-3">
            <p className="text-[10px] text-zinc-500">Média mensal</p>
            <p className="mt-1 text-[17px] font-semibold text-white tabular-nums">
              {brlFormatter.format(avgMonthly)}
            </p>
            <p className="mt-0.5 text-[9px] text-zinc-500">Últimos 12 meses</p>
          </div>
          <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a] px-4 py-3">
            <p className="text-[10px] text-zinc-500">Maior mês</p>
            <p className="mt-1 text-[17px] font-semibold text-white tabular-nums">
              {brlFormatter.format(maxMonthly)}
            </p>
            {maxMonthKey && (
              <p className="mt-0.5 text-[9px] text-zinc-500">
                {new Date(maxMonthKey + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* Gráfico mensal */}
        <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a] px-4 pb-2 pt-4">
          <h2 className="mb-3 text-[13px] font-semibold text-white">Proventos por mês</h2>
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-[180px] items-center justify-center text-xs text-zinc-500 animate-pulse">
                  Carregando gráfico…
                </div>
              }
            >
              <DividendsBarChart data={monthlyBars} />
            </Suspense>
          </ChartErrorBoundary>
        </div>

        {/* Filtros */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-white">
              Proventos recebidos{' '}
              <span className="text-zinc-500">({filteredRows.length})</span>
            </h2>
            {availableTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-white/[0.12] bg-[#242424] px-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos os tipos</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          <div className="relative mb-3">
            <input
              type="search"
              placeholder="Filtrar por ticker…"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-[#1e1e1e] px-4 py-2.5 text-[13px] text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              aria-label="Filtrar por ticker"
            />
          </div>
        </div>

        {/* Lista de proventos */}
        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Nenhum provento encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRows.map((row, idx) => (
              <DividendCardMobile key={`${row.ticker}-${row.ex_date}-${idx}`} row={row} />
            ))}
            <p className="pt-1 text-center text-[11px] text-zinc-500">
              Mostrando {filteredRows.length} de {rows.length}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Layout desktop ─────────────────────────────────────────────────────────
  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Proventos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            periods={DIVIDEND_PERIODS}
          />
          <button
            type="button"
            onClick={() => syncDividends.mutate()}
            disabled={syncDividends.isPending}
            title="Busca proventos reais via Yahoo Finance e atualiza o banco"
            className="rounded-lg border border-blue-500/50 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {syncDividends.isPending ? 'Atualizando…' : 'Atualizar proventos'}
          </button>
        </div>
      </div>

      {/* Feedback do sync */}
      {syncDividends.isSuccess && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-300" role="status">
          ✓ {syncDividends.data.inserted} registro{syncDividends.data.inserted !== 1 ? 's' : ''} sincronizado{syncDividends.data.inserted !== 1 ? 's' : ''} via Yahoo Finance
          {syncDividends.data.tickers_processed.length > 0 && (
            <span className="text-green-500 ml-1">
              ({syncDividends.data.tickers_processed.length} ativo{syncDividends.data.tickers_processed.length !== 1 ? 's' : ''})
            </span>
          )}
        </p>
      )}
      {syncDividends.isError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          Não foi possível sincronizar os proventos. Tente novamente.
        </p>
      )}

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
          className="rounded-lg border border-dark-border bg-dark-bg px-4 py-2 text-sm font-medium text-gray-200 hover:bg-dark-surface hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
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
