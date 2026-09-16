import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useAllTransactions, buildMonthlyAportes } from '../hooks/useTransactions'
import { usePositions } from '../hooks/usePositions'
import { useDeleteTransaction } from '../hooks/useTransactions'
import { AddTransactionModal } from './AddTransactionModal'
import {
  ASSET_CLASS_LABEL,
  ASSET_CLASS_ORDER,
  assetClassLabel,
  assetClassColor,
} from '../composition'
import type { AssetType } from '../types'
import type { Transaction } from '../services/transactionsService'

const AportesBarChart = lazy(() => import('./AportesBarChart'))

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
})

const qtyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function fmtMoney(v: number, currency = 'BRL'): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return currency === 'USD' ? usdFormatter.format(n) : brlFormatter.format(n)
}

function fmtQty(v: number): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return qtyFormatter.format(n)
}

const TYPE_LABEL: Record<Transaction['type'], string> = {
  buy: 'Compra', sell: 'Venda', dividend: 'Dividendo', jcp: 'JCP', bonus: 'Bonificação',
}

// ─── Error Boundary do gráfico ────────────────────────────────────────────────

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(): { hasError: boolean } { return { hasError: true } }
  componentDidCatch(e: Error, i: ErrorInfo) { console.warn('Chart error', e, i) }
  render() {
    if (this.state.hasError)
      return <div className="flex items-center justify-center h-[320px] text-sm text-gray-400">Gráfico indisponível.</div>
    return this.props.children
  }
}

// ─── Badge de tipo de ativo ───────────────────────────────────────────────────

// Mapa de labels alternativos mais amigáveis para o badge
const TYPE_BADGE_LABEL: Record<AssetType, string> = {
  stock_br:     'Ações',
  fii:          'FIIs',
  bdr:          'BDRs',
  stock_us:     'Stocks',
  reit:         'REITs',
  crypto:       'Criptos',
  fixed_income: 'Renda Fixa',
}

function AssetTypeBadge({ assetType }: { assetType: AssetType | null }) {
  if (!assetType) return <span className="text-xs text-gray-500">—</span>
  const label = TYPE_BADGE_LABEL[assetType] ?? assetClassLabel(assetType)
  const color = assetClassColor(assetType)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}

// ─── Ícone de classe ──────────────────────────────────────────────────────────

function ClassIcon({ assetType }: { assetType: AssetType | null }) {
  const color = assetType ? assetClassColor(assetType) : '#94a3b8'
  const letter = assetType ? (TYPE_BADGE_LABEL[assetType]?.[0] ?? '?') : '?'
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold text-dark-bg"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function TxnRow({
  txn,
  assetType,
  assetName,
  currency,
  quantityTotal,
  onDelete,
}: {
  txn: Transaction
  assetType: AssetType | null
  assetName: string | null
  currency: string
  quantityTotal: number
  onDelete: (id: string) => void
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteTransaction = useDeleteTransaction(txn.ticker)

  const total = Number(txn.quantity) * Number(txn.price)

  const CELL = 'px-4 py-3 text-sm text-gray-200'

  return (
    <>
      <tr className="border-t border-dark-border hover:bg-dark-surface/40 transition-colors">
        {/* Ativo */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ClassIcon assetType={assetType} />
            <span className="text-sm font-semibold text-white">{txn.ticker}</span>
          </div>
        </td>

        {/* Tipo de investimento */}
        <td className={CELL}>
          <AssetTypeBadge assetType={assetType} />
        </td>

        {/* Tipo de ordem */}
        <td className={CELL}>
          <span className={`font-medium ${txn.type === 'buy' ? 'text-green-400' : txn.type === 'sell' ? 'text-red-400' : 'text-blue-400'}`}>
            {TYPE_LABEL[txn.type] ?? txn.type}
          </span>
        </td>

        {/* Quantidade */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtQty(txn.quantity)}</td>

        {/* Preço unitário */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtMoney(txn.price, currency)}</td>

        {/* Total */}
        <td className={`${CELL} text-right font-semibold tabular-nums`}>{fmtMoney(total, currency)}</td>

        {/* Quantidade total (posição) */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtQty(quantityTotal)}</td>

        {/* Data */}
        <td className={`${CELL} tabular-nums`}>{fmtDate(txn.transaction_date)}</td>

        {/* Fonte */}
        <td className={CELL}>
          <span className="rounded border border-dark-border px-2 py-0.5 text-xs text-gray-400">Manual</span>
        </td>

        {/* Opções */}
        <td className="px-4 py-3 text-right">
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Excluir?</span>
              <button type="button" onClick={() => { deleteTransaction.mutate(txn.id); setConfirmDelete(false); onDelete(txn.id) }}
                disabled={deleteTransaction.isPending}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">Sim</button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded border border-dark-border text-gray-300 hover:text-white">Não</button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <button type="button" onClick={() => setShowAddModal(true)}
                className="text-xs px-2 py-1 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors">
                + Lançamento
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                aria-label={`Excluir lançamento de ${txn.ticker}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </button>
            </span>
          )}
        </td>
      </tr>

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        ticker={txn.ticker}
        assetType={assetType}
        assetName={assetName}
      />
    </>
  )
}

// ─── Filtros de período ───────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: '1 Ano', months: 12 },
  { label: '2 Anos', months: 24 },
  { label: '5 Anos', months: 60 },
  { label: 'Tudo', months: 0 },
] as const

type PeriodOption = typeof PERIOD_OPTIONS[number]

// ─── Página principal ─────────────────────────────────────────────────────────

export function LancamentosPage() {
  const [period, setPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[1]) // 2 Anos
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: transactions = [], isLoading, isError, refetch } = useAllTransactions()
  const { data: positions = [] } = usePositions()

  // Map de ticker → {assetType, assetName, currency, quantityTotal}
  const positionMap = useMemo(() => {
    const map = new Map<string, { assetType: AssetType | null; assetName: string | null; currency: string; quantity: number }>()
    for (const pos of positions) {
      map.set(pos.ticker, {
        assetType: pos.asset?.type ?? null,
        assetName: pos.asset?.name ?? null,
        currency: pos.asset?.currency ?? 'BRL',
        quantity: Number(pos.quantity),
      })
    }
    return map
  }, [positions])

  // Map de ticker → assetType para buildMonthlyAportes
  const assetTypeMap = useMemo(() => {
    const map = new Map<string, AssetType | null>()
    for (const [ticker, info] of positionMap) map.set(ticker, info.assetType)
    return map
  }, [positionMap])

  // Filtra por período
  const since = useMemo(() => {
    if (period.months === 0) return ''
    const d = new Date()
    d.setMonth(d.getMonth() - period.months)
    return d.toISOString().slice(0, 10)
  }, [period])

  const filteredByPeriod = useMemo(() => {
    if (!since) return transactions
    return transactions.filter((t) => t.transaction_date >= since)
  }, [transactions, since])

  // Dados para o gráfico
  const chartData = useMemo(
    () => buildMonthlyAportes(filteredByPeriod, assetTypeMap, assetTypeFilter),
    [filteredByPeriod, assetTypeMap, assetTypeFilter],
  )

  // Filtra a tabela
  const tableRows = useMemo(() => {
    let rows = filteredByPeriod
    if (assetTypeFilter !== 'all') {
      rows = rows.filter((t) => assetTypeMap.get(t.ticker) === assetTypeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      rows = rows.filter((t) => t.ticker.includes(q))
    }
    return rows
  }, [filteredByPeriod, assetTypeFilter, assetTypeMap, search])

  // ── Estados ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-400 animate-pulse">Carregando lançamentos…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8">
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3 max-w-md">
          <p className="text-red-400 font-medium">Erro ao carregar lançamentos.</p>
          <button type="button" onClick={() => refetch()} className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const HEADER_CLASS = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Lançamentos</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Adicionar Lançamento
        </button>
      </header>

      {/* ── Gráfico de consolidação ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-white">Consolidação de aportes</h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Período */}
            <div className="flex rounded-lg border border-dark-border overflow-hidden">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPeriod(opt)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    period.label === opt.label
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filtro tipo de ativo */}
            <select
              value={assetTypeFilter}
              onChange={(e) => setAssetTypeFilter(e.target.value as AssetType | 'all')}
              className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os tipos</option>
              {ASSET_CLASS_ORDER.map((type) => (
                <option key={type} value={type}>{ASSET_CLASS_LABEL[type]}</option>
              ))}
            </select>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[320px]">
            <p className="text-sm text-gray-400">Sem lançamentos no período selecionado.</p>
          </div>
        ) : (
          <ChartErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-[320px]"><p className="text-sm text-gray-400 animate-pulse">Carregando…</p></div>}>
              <AportesBarChart data={chartData} />
            </Suspense>
          </ChartErrorBoundary>
        )}
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dark-border bg-dark-surface">
        {/* Cabeçalho da seção */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-white">
            Renda variável
            <span className="ml-2 text-xs font-normal text-gray-400">({tableRows.length})</span>
          </h2>

          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ativo…"
              className="rounded-lg border border-dark-border bg-dark-bg pl-3 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <p className="text-gray-400">Nenhum lançamento encontrado.</p>
              {transactions.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Use "+ Adicionar Lançamento" para registrar compras e vendas.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-dark-bg">
                <tr>
                  <th className={HEADER_CLASS}>Ativo</th>
                  <th className={HEADER_CLASS}>Tipo de investimento</th>
                  <th className={HEADER_CLASS}>Tipo de ordem</th>
                  <th className={`${HEADER_CLASS} text-right`}>Quantidade</th>
                  <th className={`${HEADER_CLASS} text-right`}>Preço unitário</th>
                  <th className={`${HEADER_CLASS} text-right`}>Total</th>
                  <th className={`${HEADER_CLASS} text-right`}>Qtd. Total</th>
                  <th className={HEADER_CLASS}>Data do lançamento</th>
                  <th className={HEADER_CLASS}>Fonte</th>
                  <th className={`${HEADER_CLASS} text-right`}>Opções</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((txn) => {
                  const pos = positionMap.get(txn.ticker)
                  return (
                    <TxnRow
                      key={txn.id}
                      txn={txn}
                      assetType={pos?.assetType ?? null}
                      assetName={pos?.assetName ?? null}
                      currency={pos?.currency ?? 'BRL'}
                      quantityTotal={pos?.quantity ?? 0}
                      onDelete={() => {}}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal global de adicionar lançamento (sem ticker pré-selecionado) */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        ticker=""
        assetType={null}
        assetName={null}
      />
    </div>
  )
}
