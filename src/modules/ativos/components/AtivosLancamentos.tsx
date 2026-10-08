/**
 * AtivosLancamentos — sub-rota /ativos/lancamentos
 *
 * Exibe KpiBarAtivos + gráfico de aportes + tabela de lançamentos com busca.
 * Reutiliza AportesBarChart (lazy) e a lógica de TxnRow de LancamentosPage.
 */
import { Component, lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Plus, Search } from 'lucide-react'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { useAllTransactions, buildMonthlyAportes } from '../../portfolio/hooks/useTransactions'
import { useDeleteTransaction } from '../../portfolio/hooks/useTransactions'
import { derivePositionRows } from '../../portfolio/positionRows'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { PanelCard } from '../../../shared/components/PanelCard'
import { AddTransactionModal } from '../../portfolio/components/AddTransactionModal'
import {
  ASSET_CLASS_LABEL,
  ASSET_CLASS_ORDER,
  assetClassLabel,
  assetClassColor,
} from '../../portfolio/composition'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetType } from '../../portfolio/types'
import type { Transaction } from '../../portfolio/services/transactionsService'

const AportesBarChart = lazy(() => import('../../portfolio/components/AportesBarChart'))

// ── formatadores locais ────────────────────────────────────────────────────
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const qtyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0, maximumFractionDigits: 8,
})
const usdFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 8,
})

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function fmtMoney2(v: number, currency = 'BRL'): string {
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

const TYPE_BADGE_LABEL: Record<AssetType, string> = {
  stock_br:     'Ações',
  fii:          'FIIs',
  bdr:          'BDRs',
  stock_us:     'Stocks',
  etf_us:       'ETF US',
  reit:         'REITs',
  crypto:       'Criptos',
  fixed_income: 'Renda Fixa',
  etf_br:       'ETF BR',
}

// ── Filtros de período ─────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { label: '1A', months: 12 },
  { label: '2Anos', months: 24 },
  { label: '5A', months: 60 },
  { label: 'Tudo', months: 0 },
] as const
type PeriodOption = typeof PERIOD_OPTIONS[number]

// ── Error boundary do gráfico ──────────────────────────────────────────────
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

// ── Badge de tipo ─────────────────────────────────────────────────────────
function AssetTypeBadge({ assetType }: { assetType: AssetType | null }) {
  if (!assetType) return <span className="text-xs text-gray-500">—</span>
  const label = TYPE_BADGE_LABEL[assetType] ?? assetClassLabel(assetType)
  const color = assetClassColor(assetType)
  return (
    <span
      className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

// ── Ícone de classe ────────────────────────────────────────────────────────
function ClassIcon({ assetType }: { assetType: AssetType | null }) {
  const color = assetType ? assetClassColor(assetType) : '#94a3b8'
  const letter = assetType ? (TYPE_BADGE_LABEL[assetType]?.[0] ?? '?') : '?'
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold"
      style={{ backgroundColor: `${color}33`, color }}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

// ── TransactionCard — mobile ───────────────────────────────────────────────
function TransactionCard({
  txn,
  assetType,
  assetName,
  currency,
  quantityTotal: _quantityTotal,
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
  const typeColor =
    txn.type === 'buy'
      ? 'text-green-400'
      : txn.type === 'sell'
        ? 'text-red-400'
        : 'text-blue-400'

  return (
    <>
      <div className="rounded-xl border border-white/[0.08] bg-[#1B1B1B] p-3">
        {/* Linha 1: ícone + ticker + badge classe + tipo de ordem */}
        <div className="flex items-center gap-2">
          <ClassIcon assetType={assetType} />
          <span className="text-[13px] font-semibold text-white">{txn.ticker}</span>
          <AssetTypeBadge assetType={assetType} />
          <span className={`ml-auto text-[12px] font-medium ${typeColor}`}>
            {TYPE_LABEL[txn.type] ?? txn.type}
          </span>
        </div>

        {/* Linha 2: quantidade / preço unitário / total */}
        <div className="mt-2 flex items-center gap-3 text-[12px] text-white/60 tabular-nums">
          <span>
            <span className="text-white/40">Qtd </span>
            {fmtQty(txn.quantity)}
          </span>
          <span className="text-white/20">·</span>
          <span>
            <span className="text-white/40">P.U. </span>
            {fmtMoney2(txn.price, currency)}
          </span>
          <span className="text-white/20">·</span>
          <span className="font-medium text-white">
            {fmtMoney2(total, currency)}
          </span>
        </div>

        {/* Linha 3: data + manual + ações */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
          <span className="tabular-nums">{fmtDate(txn.transaction_date)}</span>
          <span className="rounded border border-white/[0.14] px-1.5 py-0.5">Manual</span>
          <div className="ml-auto flex items-center gap-1">
            {confirmDelete ? (
              <>
                <span className="text-[11px] text-white/40">Excluir?</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteTransaction.mutate(txn.id)
                    setConfirmDelete(false)
                    onDelete(txn.id)
                  }}
                  disabled={deleteTransaction.isPending}
                  className="rounded bg-red-600 px-2 py-0.5 text-[11px] text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded border border-white/[0.14] px-2 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  Não
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="rounded px-2 py-0.5 text-[11px] text-blue-400 hover:bg-blue-900/20"
                >
                  + Lançamento
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded p-1 text-red-400 hover:bg-red-900/20"
                  aria-label={`Excluir lançamento de ${txn.ticker}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

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

// ── Linha da tabela de lançamentos ─────────────────────────────────────────
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
      <tr className="border-t border-white/[0.09] transition-colors hover:bg-white/[0.025]">
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
          <span
            className={`font-medium ${
              txn.type === 'buy'
                ? 'text-green-400'
                : txn.type === 'sell'
                  ? 'text-red-400'
                  : 'text-blue-400'
            }`}
          >
            {TYPE_LABEL[txn.type] ?? txn.type}
          </span>
        </td>

        {/* Quantidade */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtQty(txn.quantity)}</td>

        {/* Preço unitário */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtMoney2(txn.price, currency)}</td>

        {/* Total */}
        <td className={`${CELL} text-right font-semibold tabular-nums`}>{fmtMoney2(total, currency)}</td>

        {/* Quantidade total */}
        <td className={`${CELL} text-right tabular-nums`}>{fmtQty(quantityTotal)}</td>

        {/* Data */}
        <td className={`${CELL} tabular-nums`}>{fmtDate(txn.transaction_date)}</td>

        {/* Fonte */}
        <td className={CELL}>
          <span className="rounded border border-white/[0.14] px-2 py-0.5 text-xs text-gray-400">Manual</span>
        </td>

        {/* Opções */}
        <td className="px-4 py-3 text-right">
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Excluir?</span>
              <button
                type="button"
                onClick={() => {
                  deleteTransaction.mutate(txn.id)
                  setConfirmDelete(false)
                  onDelete(txn.id)
                }}
                disabled={deleteTransaction.isPending}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-white/[0.14] px-2 py-1 text-xs text-gray-300 hover:text-white"
              >
                Não
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-900/20 hover:text-blue-300"
              >
                + Lançamento
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
                aria-label={`Excluir lançamento de ${txn.ticker}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4h6v2" />
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

// ── Página principal ───────────────────────────────────────────────────────
export function AtivosLancamentos() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  // ── Dados ─────────────────────────────────────────────────────────────────
  const { data: positions = [] } = usePositions(walletId)
  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
  const { data: quotes = [] } = useLatestQuotes(tickers)
  const { data: usdRateData } = useUSDRate()
  const usdRate = usdRateData?.rate ?? 5

  const quantityByTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.ticker, Number(p.quantity))
    return m
  }, [positions])

  const dividendTotalsByTicker = useDividendTotals(tickers, quantityByTicker)

  const {
    data: transactions = [],
    isLoading: txnLoading,
    isError: txnError,
    refetch: refetchTxn,
  } = useAllTransactions()

  // ── Derivação KPIs ─────────────────────────────────────────────────────────
  const { rows, totalBRL } = useMemo(
    () => derivePositionRows({ positions, quotes, usdRate }),
    [positions, quotes, usdRate],
  )

  const valorInvestidoBRL = useMemo(() => {
    if (positions.length === 0) return null
    let total = 0
    for (const p of positions) {
      const qty = Number(p.quantity)
      const avgPrice = Number(p.average_price)
      const currency = p.asset?.currency ?? 'BRL'
      const rate = currency === 'USD' ? usdRate : 1
      total += qty * avgPrice * rate
    }
    return Number.isFinite(total) && total > 0 ? total : null
  }, [positions, usdRate])

  const ganhoCapitalBRL = useMemo(() => {
    if (totalBRL <= 0 || valorInvestidoBRL === null) return null
    return totalBRL - valorInvestidoBRL
  }, [totalBRL, valorInvestidoBRL])

  const proventos12mBRL = useMemo(() => {
    let total = 0
    for (const v of dividendTotalsByTicker.values()) total += v
    return total > 0 ? total : null
  }, [dividendTotalsByTicker])

  const rentabilidadePct = useMemo(() => {
    if (valorInvestidoBRL === null || valorInvestidoBRL <= 0 || totalBRL <= 0) return null
    return ((totalBRL - valorInvestidoBRL) / valorInvestidoBRL) * 100
  }, [totalBRL, valorInvestidoBRL])

  // ── Resumo popover ─────────────────────────────────────────────────────────
  const [isResumoOpen, setIsResumoOpen] = useState(false)
  const resumoBtnRef = useRef<HTMLButtonElement | null>(null)

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[1]) // 2 Anos
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // ── Position map para lançamentos ──────────────────────────────────────────
  const positionMap = useMemo(() => {
    const map = new Map<
      string,
      { assetType: AssetType | null; assetName: string | null; currency: string; quantity: number }
    >()
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

  const assetTypeMap = useMemo(() => {
    const m = new Map<string, AssetType | null>()
    for (const [ticker, info] of positionMap) m.set(ticker, info.assetType)
    return m
  }, [positionMap])

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

  const chartData = useMemo(
    () => buildMonthlyAportes(filteredByPeriod, assetTypeMap, assetTypeFilter),
    [filteredByPeriod, assetTypeMap, assetTypeFilter],
  )

  const tableRows = useMemo(() => {
    let r = filteredByPeriod
    if (assetTypeFilter !== 'all') {
      r = r.filter((t) => assetTypeMap.get(t.ticker) === assetTypeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      r = r.filter((t) => t.ticker.includes(q))
    }
    return r
  }, [filteredByPeriod, assetTypeFilter, assetTypeMap, search])

  const HEADER_CLASS = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="flex flex-col gap-5">
      {/* ── KPI bar ── */}
      <div className="relative">
        <KpiBarAtivos
          patrimonio={fmtMoney(totalBRL > 0 ? totalBRL : null)}
          valorInvestido={fmtMoney(valorInvestidoBRL)}
          ganhoCapital={fmtMoney(ganhoCapitalBRL)}
          ganhoCapitalPositive={ganhoCapitalBRL === null ? null : ganhoCapitalBRL >= 0}
          ativos={rows.length}
          onResumo={() => setIsResumoOpen((o) => !o)}
          resumoBtnRef={resumoBtnRef}
        />

        {isResumoOpen && (
          <ResumoCarteiraPopover
            anchorRef={resumoBtnRef}
            patrimonio={fmtMoney(totalBRL > 0 ? totalBRL : null)}
            valorInvestido={fmtMoney(valorInvestidoBRL)}
            ganhoCapital={fmtMoney(ganhoCapitalBRL)}
            proventos12m={fmtMoney(proventos12mBRL)}
            dividendos={fmtMoney(proventos12mBRL)}
            rentabilidade={fmtPct(rentabilidadePct)}
            onClose={() => setIsResumoOpen(false)}
          />
        )}
      </div>

      {/* ── Gráfico de consolidação ── */}
      <PanelCard>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-white">Consolidação de aportes</h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Período */}
            <div className="flex rounded-full border border-white/[0.14] p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPeriod(opt)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    period.label === opt.label
                      ? 'bg-white/[0.12] text-white'
                      : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
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
              className="rounded-full border border-white/[0.14] bg-[#393939] px-4 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="all">Todos os tipos</option>
              {ASSET_CLASS_ORDER.map((type) => (
                <option key={type} value={type}>{ASSET_CLASS_LABEL[type]}</option>
              ))}
            </select>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center">
            <p className="text-sm text-gray-400">Sem lançamentos no período selecionado.</p>
          </div>
        ) : (
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-[320px] items-center justify-center">
                  <p className="text-sm text-gray-400 animate-pulse">Carregando…</p>
                </div>
              }
            >
              <AportesBarChart data={chartData} />
            </Suspense>
          </ChartErrorBoundary>
        )}
      </PanelCard>

      {/* ── Tabela de lançamentos ── */}
      <PanelCard padding="p-0">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-white">Renda variável</h2>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
              {tableRows.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ativo…"
                className="w-52 rounded-full border border-white/[0.18] bg-transparent py-1.5 pl-3 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <Search
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
            </div>

            {/* Botão + Lançamento */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="
                flex items-center gap-1.5 rounded-full
                bg-nf-blue px-3.5 py-1.5 text-[12px] font-medium text-white
                transition-opacity hover:opacity-90
              "
            >
              <Plus className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              Lançamento
            </button>
          </div>
        </div>

        {txnLoading ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-400 animate-pulse">Carregando lançamentos…</p>
          </div>
        ) : txnError ? (
          <div className="px-6 py-8">
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-6 max-w-md">
              <p className="text-sm font-medium text-red-400">Erro ao carregar lançamentos.</p>
              <button
                type="button"
                onClick={() => refetchTxn()}
                className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">Nenhum lançamento encontrado.</p>
          </div>
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden md:block overflow-x-auto px-2 pb-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={HEADER_CLASS}>Ativo</th>
                    <th className={HEADER_CLASS}>Tipo de investimento</th>
                    <th className={HEADER_CLASS}>Tipo de ordem</th>
                    <th className={`${HEADER_CLASS} text-right`}>Quantidade</th>
                    <th className={`${HEADER_CLASS} text-right`}>Preço unitário</th>
                    <th className={`${HEADER_CLASS} text-right`}>Total</th>
                    <th className={`${HEADER_CLASS} text-right`}>Qtd. total</th>
                    <th className={HEADER_CLASS}>Data</th>
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

            {/* Mobile: lista de cards */}
            <div className="block md:hidden flex flex-col gap-2 p-3">
              {tableRows.map((txn) => {
                const pos = positionMap.get(txn.ticker)
                return (
                  <TransactionCard
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
            </div>
          </>
        )}
      </PanelCard>

      {/* Modal global de adicionar lançamento */}
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
