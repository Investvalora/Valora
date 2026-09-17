import { useCallback, useMemo, useState, lazy, Suspense, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { Tooltip } from '../../../shared/components/Tooltip'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import type { USDRateSource } from '../../../shared/services/usdRateService'
import { useLatestQuotes } from '../hooks/useLatestQuotes'
import { usePositions } from '../hooks/usePositions'
import { useFixedIncomePositions } from '../hooks/useFixedIncomePositions'
import { useCalcFixedIncome } from '../hooks/useCalcFixedIncome'
import { downloadPositionsCsv } from '../export/positionsCsv'
import {
  DEFAULT_POSITION_SORT,
  derivePositionRows,
  nextSort,
  sortPositionRows,
} from '../positionRows'
import { enrichPositionRows } from '../enrichPositionRows'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'
import { FIXED_INCOME_TYPE_LABEL } from '../types'
import { AddPositionForm } from './AddPositionForm'
import { AddFixedIncomeForm } from './AddFixedIncomeForm'
import { GroupedPositionsTable } from './GroupedPositionsTable'
import { ColumnEditorPanel } from './ColumnEditorPanel'
import { useScoreRules, groupRulesByName } from '../../score/hooks/useScoreRules'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useColumnVisibility } from '../hooks/useColumnVisibility'
import { useDividendTotals } from '../hooks/useDividendTotals'
import { useBazin } from '../../valuation/hooks/useBazin'
import { assetClassColor, assetClassLabel } from '../composition'
import type { AssetClassSlice } from '../types'

const WealthBarChart = lazy(() => import('../../dashboard/components/WealthBarChart'))
const CompositionPieChart = lazy(() => import('./CompositionPieChart'))

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pctSignFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const pctPlainFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdRateFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

function fmtBRL(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  return brlFormatter.format(v)
}

function fmtSignedPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  return `${pctSignFormatter.format(v)}%`
}

const USD_SOURCE_LABEL: Record<USDRateSource, string> = {
  bcb: 'Banco Central do Brasil (PTAX)',
  awesomeapi: 'AwesomeAPI',
  cache: 'Última taxa obtida neste navegador',
  default: 'Taxa fixa de referência do app',
}

// ─── Card KPI ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, title, main, mainColor = 'text-white', badge,
  sub1Label, sub1Value, sub2Label, sub2Value,
}: {
  icon: string; title: string; main: string; mainColor?: string
  badge?: { label: string; up: boolean } | null
  sub1Label?: string; sub1Value?: string
  sub2Label?: string; sub2Value?: string
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
  if (slices.length === 0) return null
  return (
    <ul className="space-y-1.5 text-sm mt-3">
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
            {pctPlainFormatter.format(slice.percent)}%
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Error Boundary para gráficos ─────────────────────────────────────────────

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(): { hasError: boolean } { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn('Chart error', error, info.componentStack) }
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

// ─── Página ───────────────────────────────────────────────────────────────────

export function CarteiraPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFiModalOpen, setIsFiModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sort, setSort] = useState<PositionSort>(DEFAULT_POSITION_SORT)
  const [activeScoreName, setActiveScoreName] = useState<string | null>(null)
  const [showColumnEditor, setShowColumnEditor] = useState(false)

  // ── Visibilidade de colunas ────────────────────────────────────────────────
  const columnVisibility = useColumnVisibility()

  // ── Dashboard (KPIs + gráficos) ────────────────────────────────────────────
  const dashboard = useDashboard()

  // ── Posições e cotações ────────────────────────────────────────────────────
  const { data: positions = [], isLoading, isError, refetch } = usePositions()

  // ── Renda Fixa ─────────────────────────────────────────────────────────────
  const { rows: fiRows, totalBRL: fiTotalBRL, isLoading: fiLoading } = useFixedIncomePositions()
  const { calc: calcFiValues, state: calcFiState } = useCalcFixedIncome()

  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
  const quotesQuery = useLatestQuotes(tickers)
  const hasPositions = positions.length > 0
  const hasUSDPosition = useMemo(
    () => positions.some((p) => p.asset?.currency === 'USD'),
    [positions],
  )
  const usdRateQuery = useUSDRate({ enabled: hasUSDPosition })
  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data])
  const usdRate = usdRateQuery.data ?? null

  const derived = useMemo(
    () => derivePositionRows({ positions, quotes, usdRate: usdRate?.rate ?? null }),
    [positions, quotes, usdRate],
  )

  // ── Fundamentals — carregados sempre (não só com score ativo) ─────────────
  const fundamentalsQuery = useFundamentals(tickers)
  const fundamentals = useMemo(() => fundamentalsQuery.data ?? [], [fundamentalsQuery.data])

  const fundamentalsByTicker = useMemo(() => {
    const map = new Map(fundamentals.map((f) => [f.ticker, f]))
    return map
  }, [fundamentals])

  const fundamentalsUpdatedAt = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of fundamentals) map.set(row.ticker, row.updated_at)
    return map
  }, [fundamentals])

  // ── Proventos por ticker (12M) ─────────────────────────────────────────────
  const quantityByTicker = useMemo(
    () => new Map(positions.map((p) => [p.ticker, p.quantity])),
    [positions],
  )
  const dividendTotals = useDividendTotals(tickers, quantityByTicker)

  // ── Bazin (preço-teto) — reutiliza a lógica já existente na aba Estratégias
  const { bazinByTicker } = useBazin(tickers, 0.06)

  // ── Enriquecimento com pl, pvp, dy, proventos, payout, yieldOnCost, graham, bazin
  const enrichedBase = useMemo(
    () => enrichPositionRows({
      rows: derived.rows,
      fundamentalsByTicker,
      dividendTotalsByTicker: dividendTotals,
      bazinByTicker,
    }),
    [derived.rows, fundamentalsByTicker, dividendTotals, bazinByTicker],
  )

  // ── Score ──────────────────────────────────────────────────────────────────
  const { data: allRules = [] } = useScoreRules()

  const scoreNames = useMemo(() => {
    return Array.from(groupRulesByName(allRules).keys()).sort()
  }, [allRules])

  const activeRules = useMemo(() => {
    if (!activeScoreName) return []
    return allRules.filter((r) => r.name === activeScoreName)
  }, [allRules, activeScoreName])

  const scoreByTicker = useCalculateScore(activeRules, fundamentals)

  const enrichedRows = useMemo((): PositionRow[] => {
    if (!activeScoreName || scoreByTicker.size === 0) return enrichedBase
    return enrichedBase.map((row) => ({
      ...row,
      score: scoreByTicker.has(row.ticker) ? (scoreByTicker.get(row.ticker) ?? null) : null,
    }))
  }, [enrichedBase, activeScoreName, scoreByTicker])

  const scoredRows = useMemo(() => sortPositionRows(enrichedRows, sort), [enrichedRows, sort])

  const handleSortChange = useCallback((column: PositionSortColumn) => {
    setSort((current) => nextSort(current, column))
  }, [])

  const handleExport = () => {
    setSuccessMessage('')
    setErrorMessage('')
    try {
      downloadPositionsCsv(scoredRows)
      setSuccessMessage('Relatório CSV baixado.')
    } catch {
      setErrorMessage('Não foi possível baixar o relatório CSV.')
    }
  }

  const openModal = () => { setSuccessMessage(''); setIsModalOpen(true) }

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsModalOpen(false)
  }, [isSaving])

  const handleSuccess = (ticker: string) => {
    setIsSaving(false)
    setIsModalOpen(false)
    setSuccessMessage(`Posição em ${ticker} cadastrada.`)
  }

  const positionCount = `${positions.length} ${positions.length === 1 ? 'posição cadastrada' : 'posições cadastradas'}`

  const variacaoBadge = dashboard.variacaoPct !== null
    ? { label: fmtSignedPct(dashboard.variacaoPct), up: dashboard.variacaoPct >= 0 }
    : null

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Carteira</h1>
          <p className="mt-1 text-sm text-gray-400">
            {isLoading ? 'Carregando posições...' : isError && !hasPositions ? 'Não foi possível carregar as posições.' : positionCount}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/carteira/importar-transacoes" className="rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/10">
            Importar transações
          </a>
          <button type="button" onClick={handleExport} disabled={scoredRows.length === 0}
            className="rounded-lg border border-green-500 px-4 py-2.5 text-sm font-semibold text-green-200 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50">
            Exportar CSV
          </button>
          <button type="button" onClick={openModal}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            + adicionar posição
          </button>
          <button type="button" onClick={() => setIsFiModalOpen(true)}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            + renda fixa
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage('')
              setSuccessMessage('Sincronizar dados: Em breve.')
            }}
            className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700/50"
          >
            Sincronizar dados
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage('')
              setSuccessMessage('Gerar insights: Em breve.')
            }}
            className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700/50"
          >
            Gerar insights
          </button>
          {/* Botão Editar colunas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnEditor((v) => !v)}
              className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={showColumnEditor}
            >
              ⊞ Editar colunas
            </button>
            {showColumnEditor && (
              <ColumnEditorPanel
                visibility={columnVisibility}
                onClose={() => setShowColumnEditor(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── Cards KPI ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon="🔄"
          title="Patrimônio total"
          main={fmtBRL(dashboard.totalPatrimonioBRL)}
          badge={variacaoBadge}
          sub1Label="Valor investido"
          sub1Value={fmtBRL(dashboard.valorInvestidoBRL)}
        />
        <KpiCard
          icon="💡"
          title="Lucro total"
          main={fmtBRL(dashboard.lucroTotalBRL)}
          mainColor={
            dashboard.lucroTotalBRL === null ? 'text-white'
              : dashboard.lucroTotalBRL >= 0 ? 'text-green-400' : 'text-red-400'
          }
          sub1Label="Ganho de Capital"
          sub1Value={fmtBRL(dashboard.ganhoCapitalBRL)}
          sub2Label="Dividendos Recebidos"
          sub2Value={fmtBRL(dashboard.proventos12mBRL)}
        />
        <KpiCard
          icon="📋"
          title="Proventos Recebidos (12M)"
          main={fmtBRL(dashboard.proventos12mBRL)}
          sub1Label="Total"
          sub1Value={fmtBRL(dashboard.proventos12mBRL)}
        />
        {/* Card de Rentabilidade — dois valores lado a lado, estilo Investidor10 */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-5 flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">📊</span>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Rentabilidade</p>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-gray-500">Últimos 12M</p>
              <p className={`text-xl font-bold tabular-nums ${
                dashboard.variacaoPct === null ? 'text-gray-500'
                  : dashboard.variacaoPct >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {dashboard.variacaoPct !== null
                  ? `${fmtSignedPct(dashboard.variacaoPct)}%`
                  : '—'}
                {dashboard.variacaoPct !== null && (
                  <span className="ml-1 text-sm">{dashboard.variacaoPct >= 0 ? '↗' : '↘'}</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-gray-500">Total</p>
              <p className={`text-xl font-bold tabular-nums ${
                dashboard.rentabilidadeTotalPct === null ? 'text-gray-500'
                  : dashboard.rentabilidadeTotalPct >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {dashboard.rentabilidadeTotalPct !== null
                  ? `${fmtSignedPct(dashboard.rentabilidadeTotalPct)}%`
                  : '—'}
                {dashboard.rentabilidadeTotalPct !== null && (
                  <span className="ml-1 text-sm">{dashboard.rentabilidadeTotalPct >= 0 ? '↗' : '↘'}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico de barras + pizza ───────────────────────────────────────── */}
      {hasPositions && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Evolução do patrimônio — barras mensais */}
          <div className="lg:col-span-2 rounded-xl border border-dark-border bg-dark-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Evolução do Patrimônio</h2>
              <span className="text-xs text-gray-500">Últimos 12 Meses</span>
            </div>
            {dashboard.monthlySeries.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-gray-400">Sem histórico disponível.</p>
              </div>
            ) : (
              <ChartErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-[280px]"><p className="text-sm text-gray-400 animate-pulse">Carregando…</p></div>}>
                  <WealthBarChart data={dashboard.monthlySeries} />
                </Suspense>
              </ChartErrorBoundary>
            )}
          </div>

          {/* Ativos na carteira — pizza + legenda */}
          <div className="rounded-xl border border-dark-border bg-dark-surface p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-white mb-2">Ativos na Carteira</h2>
            {dashboard.compositionSlices.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <p className="text-sm text-gray-400">Sem posições avaliadas.</p>
              </div>
            ) : (
              <>
                <div aria-hidden="true">
                  <ChartErrorBoundary>
                    <Suspense fallback={<div className="h-[220px]" />}>
                      <CompositionPieChart
                        slices={dashboard.compositionSlices}
                        formatBRL={fmtBRL}
                        formatPercent={(v) => `${pctPlainFormatter.format(v)}%`}
                      />
                    </Suspense>
                  </ChartErrorBoundary>
                </div>
                <PieLegend slices={dashboard.compositionSlices} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Aviso de taxa USD ──────────────────────────────────────────── */}
      {hasPositions && hasUSDPosition && usdRate && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
          <span className="inline-flex items-center gap-2">
            Dólar usado na conversão: US$ 1,00 = R$ {usdRateFormatter.format(usdRate.rate)}
            <Tooltip label="Procedência da taxa de câmbio USD/BRL">
              <span className="block font-semibold text-white">Taxa USD/BRL</span>
              <span className="mt-1 block">Fonte: {USD_SOURCE_LABEL[usdRate.source]}</span>
              <span className="block">Data: {usdRate.date || 'não informada'}</span>
            </Tooltip>
          </span>
          {usdRate.isFallback && (
            <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
              taxa USD aproximada
            </span>
          )}
        </div>
      )}

      {/* ── Seletor de score ───────────────────────────────────────────────── */}
      {scoreNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="score-selector" className="text-sm font-medium text-gray-300 flex-shrink-0">
            Score ativo:
          </label>
          <select
            id="score-selector"
            value={activeScoreName ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setActiveScoreName(value || null)
              if (!value && sort.column === 'score') setSort(DEFAULT_POSITION_SORT)
            }}
            className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Nenhum —</option>
            {scoreNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {activeScoreName && fundamentalsQuery.isLoading && (
            <span className="text-xs text-gray-400">Carregando fundamentals…</span>
          )}
          {activeScoreName && fundamentalsQuery.isError && (
            <span className="inline-flex items-center gap-2 text-xs text-red-400">
              Erro ao carregar fundamentals.
              <button type="button" onClick={() => fundamentalsQuery.refetch()} className="underline hover:text-red-300">
                Tentar novamente
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Mensagens de status ─────────────────────────────────────────────── */}
      {successMessage && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4" role="status">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">
            {hasPositions
              ? 'Não foi possível atualizar suas posições. A lista abaixo é a última carregada.'
              : 'Não foi possível carregar suas posições.'}
          </p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200">
            Tentar novamente
          </button>
        </div>
      )}
      {quotesQuery.isError && hasPositions && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4" role="alert">
          <p className="text-sm text-amber-300">
            Não foi possível carregar as cotações. As posições continuam listadas, sem valor de mercado.
          </p>
          <button type="button" onClick={() => quotesQuery.refetch()} className="mt-2 text-sm font-medium text-amber-200 underline hover:text-amber-100">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Tabela agrupada ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : hasPositions || !isError ? (
        <GroupedPositionsTable
          rows={scoredRows}
          totalBRL={derived.totalBRL}
          sort={sort}
          onSortChange={handleSortChange}
          scoreByTicker={activeScoreName ? scoreByTicker : undefined}
          fundamentalsUpdatedAt={fundamentalsUpdatedAt}
          visibleColumns={columnVisibility.visible}
        />
      ) : null}

      {/* ── Renda Fixa ─────────────────────────────────────────────────── */}
      <section aria-labelledby="fi-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="fi-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Renda Fixa
            {fiRows.length > 0 && (
              <span className="ml-2 text-gray-500 normal-case tracking-normal font-normal">
                ({fiRows.length})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {fiRows.some(r => r.isStale) && (
              <span className="text-xs text-amber-400">valores desatualizados</span>
            )}
            <button
              type="button"
              onClick={calcFiValues}
              disabled={calcFiState === 'loading' || fiRows.length === 0}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calcFiState === 'loading' ? 'Calculando…' : '↻ Atualizar valores'}
            </button>
          </div>
        </div>

        {fiLoading ? (
          <p className="text-sm text-gray-400">Carregando renda fixa…</p>
        ) : fiRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dark-border p-6 text-center">
            <p className="text-sm text-gray-400">
              Nenhuma posição de renda fixa cadastrada.{' '}
              <button
                type="button"
                onClick={() => setIsFiModalOpen(true)}
                className="text-emerald-400 underline hover:text-emerald-300"
              >
                Adicionar
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-dark-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-surface/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Aplicado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Valor atual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Rendimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {fiRows.map((row) => (
                    <tr key={row.id} className="bg-dark-surface hover:bg-dark-bg/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-4 py-3 text-gray-300">{FIXED_INCOME_TYPE_LABEL[row.type]}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {fmtBRL(row.principal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.currentValue !== null ? (
                          <span className={row.isStale ? 'text-amber-300' : 'text-white'}>
                            {fmtBRL(row.currentValue)}
                            {row.isStale && (
                              <Tooltip label="Valor desatualizado">
                                <span className="block text-xs text-amber-400">estimado</span>
                              </Tooltip>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.gainBRL !== null && row.gainPercent !== null ? (
                          <span className={row.gainBRL >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {row.gainBRL >= 0 ? '+' : ''}{fmtBRL(row.gainBRL)}{' '}
                            <span className="text-xs">
                              ({row.gainPercent >= 0 ? '+' : ''}{row.gainPercent.toFixed(2)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {row.maturity_date
                          ? new Date(row.maturity_date + 'T12:00:00').toLocaleDateString('pt-BR')
                          : <span className="text-gray-500">Sem venc.</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-dark-border bg-dark-surface/50">
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Total</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      {fmtBRL(fiRows.reduce((s, r) => s + r.principal, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      {fmtBRL(fiTotalBRL)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Modal adicionar posição ─────────────────────────────────────────── */}
      <Modal isOpen={isModalOpen} title="Adicionar posição" onClose={closeModal} dismissible={!isSaving}>
        <AddPositionForm onSuccess={handleSuccess} onCancel={closeModal} onBusyChange={setIsSaving} />
      </Modal>

      {/* ── Modal adicionar renda fixa ──────────────────────────────────────── */}
      <Modal isOpen={isFiModalOpen} title="Adicionar renda fixa" onClose={() => setIsFiModalOpen(false)} dismissible={!isSaving}>
        <AddFixedIncomeForm
          onSuccess={() => { setIsFiModalOpen(false); setSuccessMessage('Posição de renda fixa adicionada.') }}
          onCancel={() => setIsFiModalOpen(false)}
          onBusyChange={setIsSaving}
        />
      </Modal>
    </div>
  )
}
