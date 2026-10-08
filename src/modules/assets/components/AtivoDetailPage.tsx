import { useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { PeriodSelector } from '../../wealth/components/PeriodSelector'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useAssetDetail } from '../hooks/useAssetDetail'
import { usePriceHistory } from '../hooks/usePriceHistory'
import { useAssetDividends } from '../hooks/useAssetDividends'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useScoreRules } from '../../score/hooks/useScoreRules'
import { useScorePreferences } from '../../score/hooks/useScorePreferences'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'
import { useBazin } from '../../valuation/hooks/useBazin'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { useAllTransactions } from '../../portfolio/hooks/useTransactions'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { assetClassColor, assetClassLabel } from '../../portfolio/composition'
import { fmtMoney, fmtPct } from '../../ativos/utils/fmt'
import type { AssetCurrency } from '../../portfolio/types'
import type { WealthPeriod } from '../../wealth/types'
import type { PricePoint } from '../types'

// ─── Constantes ──────────────────────────────────────────────────────────────

const PRICE_PERIODS: WealthPeriod[] = ['1M', '3M', '6M', '1A', 'Tudo']

const MISSING = '—'

// ─── Formatadores locais ──────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return MISSING
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFormatter.format(d)
}

// ─── Tipos de Tab ─────────────────────────────────────────────────────────────

type AtivoTab = 'visao-geral' | 'lancamentos' | 'proventos' | 'rentabilidade' | 'score' | 'alertas'

const TAB_LABELS: Record<AtivoTab, string> = {
  'visao-geral': 'Visão geral',
  'lancamentos': 'Lançam.',
  'proventos': 'Proventos',
  'rentabilidade': 'Rentab.',
  'score': 'Score',
  'alertas': 'Alertas',
}

const TAB_KEYS: AtivoTab[] = ['visao-geral', 'lancamentos', 'proventos', 'rentabilidade', 'score', 'alertas']

// ─── Error Boundary para o gráfico ────────────────────────────────────────────

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Gráfico de preços não pôde ser renderizado.', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[260px] items-center justify-center rounded-lg border border-white/[0.08]">
          <p className="text-sm text-[#8f8f8f]">Gráfico indisponível.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── SubTabBar interno (sem NavLink — controle via onClick) ───────────────────

interface InternalSubTabBarProps {
  activeTab: AtivoTab
  onTabChange: (tab: AtivoTab) => void
}

function InternalSubTabBar({ activeTab, onTabChange }: InternalSubTabBarProps) {
  return (
    <div className="flex gap-6 border-b border-white/[0.08] overflow-x-auto" role="tablist">
      {TAB_KEYS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={[
            'pb-2.5 px-0 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            activeTab === tab
              ? 'border-nf-blue text-white'
              : 'border-transparent text-white/50 hover:text-white/80',
          ].join(' ')}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )
}

// ─── AssetDetailHero ──────────────────────────────────────────────────────────

interface AssetDetailHeroProps {
  ticker: string
  name: string
  type: string
  color: string
  currentPrice: number | null
  dailyChangePct: number | null
  currency: AssetCurrency
  onBack: () => void
}

function AssetDetailHero({
  ticker,
  name,
  type,
  color,
  currentPrice,
  dailyChangePct,
  currency,
  onBack,
}: AssetDetailHeroProps) {
  const initial = ticker.charAt(0).toUpperCase()
  const badgeBg = color + '29' // ~16% opacity hex

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Breadcrumb */}
      <div className="text-xs text-[#8f8f8f] flex items-center gap-1 mb-1">
        <button type="button" onClick={onBack} className="hover:text-white transition-colors">
          ← Ativos
        </button>
        <span>/</span>
        <span className="text-white/60">Posições</span>
      </div>

      {/* Info row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          {/* Avatar 52×52 */}
          <div
            className="w-[52px] h-[52px] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[20px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[32px] font-medium text-white leading-none">{ticker}</span>
              {/* Badge de tipo */}
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium uppercase"
                style={{ backgroundColor: badgeBg, color }}
              >
                {type}
              </span>
            </div>
            <span className="text-[13px] text-[#8f8f8f]">{name}</span>
          </div>
        </div>

        {/* Cotação + variação */}
        <div className="flex flex-col gap-0.5 md:ml-6">
          <span className="text-[26px] font-semibold text-white tabular-nums">
            {currentPrice != null ? fmtMoney(currentPrice, currency) : MISSING}
          </span>
          {dailyChangePct != null && (
            <span
              className={`text-sm font-medium tabular-nums ${
                dailyChangePct >= 0 ? 'text-nf-green' : 'text-nf-pink'
              }`}
            >
              {fmtPct(dailyChangePct)} hoje
            </span>
          )}
        </div>

        {/* Botões de ação — pushed to right on desktop */}
        <div className="flex gap-2 md:ml-auto">
          <button
            type="button"
            className="rounded-[20px] bg-[#393939] px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-[#444] transition-colors"
          >
            + Lançamento do ativo
          </button>
          <button
            type="button"
            className="rounded-[20px] bg-[#393939] px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-[#444] transition-colors"
          >
            Criar alerta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AssetKpiGrid ─────────────────────────────────────────────────────────────

interface AssetKpiGridProps {
  quantity: number | null
  avgPrice: number | null
  balance: number | null
  portfolioWeight: number | null
  changeVsAvg: number | null
  dy: number | null
  currency: AssetCurrency
}

function AssetKpiGrid({
  quantity,
  avgPrice,
  balance,
  portfolioWeight,
  changeVsAvg,
  dy,
  currency,
}: AssetKpiGridProps) {
  const kpis = [
    { label: 'Quantidade', value: quantity != null ? quantity.toLocaleString('pt-BR') : MISSING },
    { label: 'Preço médio', value: avgPrice != null ? fmtMoney(avgPrice, currency) : MISSING },
    { label: 'Saldo', value: balance != null ? fmtMoney(balance, currency) : MISSING },
    { label: '% da carteira', value: portfolioWeight != null ? fmtPct(portfolioWeight) : MISSING },
    {
      label: 'Variação (vs PM)',
      value: changeVsAvg != null ? fmtPct(changeVsAvg) : MISSING,
      color:
        changeVsAvg == null
          ? undefined
          : changeVsAvg >= 0
          ? 'text-nf-green'
          : 'text-nf-pink',
    },
    { label: 'Dividend Yield', value: dy != null ? fmtPct(dy) : MISSING },
  ]

  return (
    <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-6">
      {kpis.map(({ label, value, color }) => (
        <div
          key={label}
          className="border border-[rgba(144,144,144,0.55)] rounded-[10px] px-[14px] py-[12px]"
        >
          <p className="text-[11px] text-[#8f8f8f] mb-1">{label}</p>
          <p className={`text-sm font-semibold tabular-nums ${color ?? 'text-white'}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── PriceLineChartWithAvg (gráfico com linha de preço médio) ─────────────────

interface PriceLineChartWithAvgProps {
  data: PricePoint[]
  avgPrice: number | null
  currency?: string
}

function formatAxisDate(value: string): string {
  if (typeof value !== 'string' || value.length < 10) return value
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}

function formatYAxis(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value >= 100 ? value.toFixed(0) : value.toFixed(2)
}

interface DualTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | null; dataKey?: string; name?: string }>
  label?: string
  currency?: string
}

function DualTooltip({ active, payload, label, currency = 'BRL' }: DualTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const prefix = currency === 'USD' ? 'US$ ' : 'R$ '
  const numFmt = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1B1B1B] px-3 py-2 shadow-lg">
      {label && (
        <p className="text-xs text-[#8f8f8f] mb-1">{(() => {
          const parts = label.split('-')
          return `${parts[2]}/${parts[1]}/${parts[0]}`
        })()}</p>
      )}
      {payload.map((item, i) => (
        item.value != null && Number.isFinite(item.value) ? (
          <p key={i} className="text-sm font-semibold text-white">
            {item.name}: {prefix}{numFmt.format(item.value)}
          </p>
        ) : null
      ))}
    </div>
  )
}

function PriceLineChartWithAvg({ data, avgPrice, currency = 'BRL' }: PriceLineChartWithAvgProps) {
  // Enrich data with avgPrice as a constant field
  const chartData = useMemo(
    () => data.map((p) => ({ ...p, avgPrice: avgPrice ?? undefined })),
    [data, avgPrice],
  )

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#38bdf8] rounded" />
          <span className="text-xs text-[#8f8f8f]">Cotação</span>
        </div>
        {avgPrice != null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#eab308] rounded border-dashed border-t-2 border-[#eab308]" />
            <span className="text-xs text-[#8f8f8f]">Preço médio</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            domain={['auto', 'auto']}
          />
          <RechartsTooltip content={<DualTooltip currency={currency} />} />
          <Line
            type="monotone"
            dataKey="close"
            name="Cotação"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {avgPrice != null && (
            <Line
              type="monotone"
              dataKey="avgPrice"
              name="Preço médio"
              stroke="#eab308"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: '#eab308' }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── AssetPositionResult ──────────────────────────────────────────────────────

interface AssetPositionResultProps {
  valorInvestido: number | null
  ganhoCapital: number | null
  proventos12m: number | null
  rentTotal: number | null
  vscdipp: number | null
  currency: AssetCurrency
}

function AssetPositionResult({
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
  currency,
}: AssetPositionResultProps) {
  const rows = [
    {
      label: 'Valor investido',
      value: valorInvestido != null ? fmtMoney(valorInvestido, currency) : MISSING,
      color: 'text-white',
    },
    {
      label: '+ Ganho de capital',
      value: ganhoCapital != null ? fmtMoney(ganhoCapital, currency) : MISSING,
      color: ganhoCapital != null && ganhoCapital >= 0 ? 'text-nf-green' : 'text-nf-pink',
    },
    {
      label: 'Proventos recebidos (12M)',
      value: proventos12m != null ? fmtMoney(proventos12m, currency) : MISSING,
      color: 'text-nf-green',
    },
    {
      label: 'Rentabilidade total',
      value: rentTotal != null ? fmtPct(rentTotal) : MISSING,
      color: rentTotal != null && rentTotal >= 0 ? 'text-nf-green' : 'text-nf-pink',
    },
    {
      label: 'vs CDI',
      value: vscdipp != null ? `${vscdipp >= 0 ? '+' : ''}${vscdipp.toFixed(2)} p.p.` : MISSING,
      color: vscdipp != null && vscdipp >= 0 ? 'text-nf-green' : 'text-nf-pink',
    },
  ]

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">Resultado da posição</h3>
      <div className="space-y-3">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[13px] text-[#8f8f8f]">{label}</span>
            <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

// ─── AssetTransactionPreview ──────────────────────────────────────────────────

interface AssetTransactionPreviewProps {
  ticker: string
  navigate: (path: string) => void
}

function AssetTransactionPreview({ ticker, navigate }: AssetTransactionPreviewProps) {
  const { data: allTxns = [], isLoading } = useAllTransactions()

  const recent = useMemo(
    () =>
      allTxns
        .filter((t) => t.ticker === ticker && (t.type === 'buy' || t.type === 'sell'))
        .slice(0, 3),
    [allTxns, ticker],
  )

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Lançamentos</h3>
        <button
          type="button"
          onClick={() => navigate('/ativos/lancamentos')}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver todos &gt;
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">Sem lançamentos registrados.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((txn) => {
            const total = Number(txn.quantity) * Number(txn.price)
            return (
              <div key={txn.id} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#8f8f8f]">{fmtDate(txn.transaction_date)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    txn.type === 'buy'
                      ? 'bg-nf-green/20 text-nf-green'
                      : 'bg-nf-pink/20 text-nf-pink'
                  }`}
                >
                  {txn.type === 'buy' ? 'Compra' : 'Venda'}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {fmtMoney(total)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </PanelCard>
  )
}

// ─── AssetDividendPreview ─────────────────────────────────────────────────────

interface AssetDividendPreviewProps {
  ticker: string
  quantity: number
  currency: AssetCurrency
  navigate: (path: string) => void
}

function AssetDividendPreview({ ticker, quantity, currency, navigate }: AssetDividendPreviewProps) {
  const { data: dividends = [], isLoading } = useAssetDividends(ticker)

  const recent = useMemo(() => dividends.slice(0, 4), [dividends])

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Proventos</h3>
        <button
          type="button"
          onClick={() => navigate('/desempenho/proventos')}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver todos &gt;
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">Sem proventos registrados.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((div, i) => {
            const total = Number(div.value_per_share) * quantity
            return (
              <div key={`${div.ex_date}-${i}`} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#8f8f8f]">{fmtDate(div.ex_date)}</span>
                <span className="text-[12px] text-[#8f8f8f]">
                  {fmtMoney(Number(div.value_per_share), currency)} × {quantity}
                </span>
                <span className="text-sm font-semibold text-nf-green tabular-nums">
                  = {fmtMoney(total, currency)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </PanelCard>
  )
}

// ─── AssetScoreAlerts ─────────────────────────────────────────────────────────

interface BazinResult {
  hasData: boolean
  annualDividend?: number | null
  ceilingPrice?: number | null
  currentPrice?: number | null
  margin?: number | null
}

interface AssetScoreAlertsProps {
  ticker: string
  bazin: BazinResult | undefined
  scoreValue: number | null | undefined
  activeScoreName: string | null
  navigate: (path: string) => void
}

function AssetScoreAlerts({
  ticker,
  bazin,
  scoreValue,
  activeScoreName,
  navigate,
}: AssetScoreAlertsProps) {
  const { data: allAlerts = [] } = useAlerts()

  const tickerAlerts = useMemo(
    () => allAlerts.filter((a) => a.ticker === ticker).slice(0, 2),
    [allAlerts, ticker],
  )

  // Bazin rules: hasData, ceilingPrice > currentPrice, margin > 0, annualDividend > 0 = 4 rules max
  const bazinRulesPassed = useMemo(() => {
    if (!bazin || !bazin.hasData) return 0
    let count = 0
    if (bazin.hasData) count++
    if (bazin.annualDividend != null && bazin.annualDividend > 0) count++
    if (bazin.ceilingPrice != null && bazin.ceilingPrice > 0) count++
    if (bazin.margin != null && bazin.margin > 0) count++
    return count
  }, [bazin])

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Score &amp; Alertas</h3>
        <button
          type="button"
          onClick={() => navigate('/analise/alertas')}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver análise &gt;
        </button>
      </div>

      {/* Score */}
      {activeScoreName && (
        <div className="mb-4">
          <p className="text-xs text-[#8f8f8f] mb-1">{activeScoreName}</p>
          <span
            className={`text-xl font-bold tabular-nums ${
              scoreValue == null
                ? 'text-[#8f8f8f]'
                : scoreValue > 0
                ? 'text-nf-green'
                : scoreValue < 0
                ? 'text-nf-pink'
                : 'text-white'
            }`}
          >
            {scoreValue == null ? 'N/A' : scoreValue > 0 ? `+${scoreValue}` : scoreValue}
          </span>
        </div>
      )}

      {/* Bazin progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[#8f8f8f]">Regras Bazin</p>
          <p className="text-xs text-white">{bazinRulesPassed}/4</p>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-nf-blue transition-all"
            style={{ width: `${(bazinRulesPassed / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Alertas */}
      {tickerAlerts.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">Sem alertas para este ativo.</p>
      ) : (
        <div className="space-y-2">
          {tickerAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-2">
              <p className="text-[12px] text-white/80 flex-1 truncate">{alert.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                  alert.status === 'novo'
                    ? 'bg-nf-blue/20 text-nf-blue'
                    : 'bg-white/[0.06] text-[#8f8f8f]'
                }`}
              >
                {alert.status === 'novo' ? 'Novo' : 'Ignorado'}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  )
}

// ─── Tab: Lançamentos ─────────────────────────────────────────────────────────

interface TabLancamentosProps {
  ticker: string
  navigate: (path: string) => void
}

function TabLancamentos({ ticker, navigate }: TabLancamentosProps) {
  const { data: allTxns = [], isLoading } = useAllTransactions()

  const txns = useMemo(
    () => allTxns.filter((t) => t.ticker === ticker),
    [allTxns, ticker],
  )

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Todos os Lançamentos — {ticker}</h3>
        <button
          type="button"
          onClick={() => navigate('/ativos/lancamentos')}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver na tela completa &gt;
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : txns.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem lançamentos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Data</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Tipo</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Qtd</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Preço</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Total</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((txn) => (
                <tr key={txn.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2 text-[#8f8f8f]">{fmtDate(txn.transaction_date)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        txn.type === 'buy' ? 'bg-nf-green/20 text-nf-green' : 'bg-nf-pink/20 text-nf-pink'
                      }`}
                    >
                      {txn.type === 'buy' ? 'Compra' : txn.type === 'sell' ? 'Venda' : txn.type}
                    </span>
                  </td>
                  <td className="py-2 text-right text-white tabular-nums">{Number(txn.quantity).toLocaleString('pt-BR')}</td>
                  <td className="py-2 text-right text-white tabular-nums">{fmtMoney(Number(txn.price))}</td>
                  <td className="py-2 text-right text-white tabular-nums font-medium">
                    {fmtMoney(Number(txn.quantity) * Number(txn.price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

// ─── Tab: Proventos ───────────────────────────────────────────────────────────

interface TabProventosProps {
  ticker: string
  quantity: number
  currency: AssetCurrency
}

function TabProventos({ ticker, quantity, currency }: TabProventosProps) {
  const { data: dividends = [], isLoading, isError, refetch } = useAssetDividends(ticker)

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">Proventos — {ticker}</h3>
      {isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : isError ? (
        <div>
          <p className="text-sm text-nf-pink mb-2">Erro ao carregar proventos.</p>
          <button type="button" onClick={() => refetch()} className="text-sm underline text-nf-pink/80">
            Tentar novamente
          </button>
        </div>
      ) : dividends.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem histórico de proventos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Data COM</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Tipo</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Por cota</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">Total recebido</th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((d, i) => (
                <tr key={`${d.ticker}-${d.ex_date}-${i}`} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2 text-[#8f8f8f]">{fmtDate(d.ex_date)}</td>
                  <td className="py-2 text-[#8f8f8f] uppercase text-xs">{d.type}</td>
                  <td className="py-2 text-right text-white tabular-nums">{fmtMoney(Number(d.value_per_share), currency)}</td>
                  <td className="py-2 text-right text-nf-green tabular-nums font-medium">
                    {fmtMoney(Number(d.value_per_share) * quantity, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

// ─── Tab: Rentabilidade ───────────────────────────────────────────────────────

interface TabRentabilidadeProps {
  ticker: string
  priceHistory: PricePoint[]
  avgPrice: number | null
  currency: AssetCurrency
  period: WealthPeriod
  onPeriodChange: (p: WealthPeriod) => void
  valorInvestido: number | null
  ganhoCapital: number | null
  proventos12m: number | null
  rentTotal: number | null
  vscdipp: number | null
}

function TabRentabilidade({
  priceHistory,
  avgPrice,
  currency,
  period,
  onPeriodChange,
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
}: TabRentabilidadeProps) {
  return (
    <div className="space-y-4">
      <PanelCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Cotação e preço médio</h3>
          <PeriodSelector value={period} onChange={onPeriodChange} periods={PRICE_PERIODS} />
        </div>
        {priceHistory.length > 0 ? (
          <ChartErrorBoundary>
            <PriceLineChartWithAvg data={priceHistory} avgPrice={avgPrice} currency={currency} />
          </ChartErrorBoundary>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
            <p className="text-sm text-[#8f8f8f]">Sem histórico para o período selecionado.</p>
          </div>
        )}
      </PanelCard>
      <AssetPositionResult
        valorInvestido={valorInvestido}
        ganhoCapital={ganhoCapital}
        proventos12m={proventos12m}
        rentTotal={rentTotal}
        vscdipp={vscdipp}
        currency={currency}
      />
    </div>
  )
}

// ─── Tab: Score ───────────────────────────────────────────────────────────────

interface TabScoreProps {
  ticker: string
  activeScoreName: string | null
  scoreValue: number | null | undefined
  bazin: BazinResult | undefined
  currency: AssetCurrency
}

function TabScore({ activeScoreName, scoreValue, bazin, currency }: TabScoreProps) {
  return (
    <div className="space-y-4">
      {activeScoreName && (
        <PanelCard>
          <h3 className="text-sm font-semibold text-white mb-3">Score Fundamentalista</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8f8f8f]">Score:</span>
            <span className="font-medium text-white">{activeScoreName}</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                scoreValue == null
                  ? 'text-[#8f8f8f]'
                  : scoreValue > 0
                  ? 'text-nf-green'
                  : scoreValue < 0
                  ? 'text-nf-pink'
                  : 'text-white'
              }`}
            >
              {scoreValue == null ? 'N/A' : scoreValue > 0 ? `+${scoreValue}` : scoreValue}
            </span>
          </div>
        </PanelCard>
      )}

      <PanelCard>
        <h3 className="text-sm font-semibold text-white mb-3">Preço-Teto Bazin (DY 6%)</h3>
        {bazin ? (
          bazin.hasData ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Dividendo 12M</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.annualDividend ?? null, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Preço-Teto</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.ceilingPrice ?? null, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Cotação</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.currentPrice ?? null, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Margem</p>
                <p
                  className={`font-semibold tabular-nums ${
                    bazin.margin == null
                      ? 'text-[#8f8f8f]'
                      : bazin.margin > 0
                      ? 'text-nf-green'
                      : 'text-nf-pink'
                  }`}
                >
                  {bazin.margin != null ? fmtPct(bazin.margin) : MISSING}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8f8f8f]">
              Sem histórico de dividendos nos últimos 12 meses para calcular o preço-teto.
            </p>
          )
        ) : (
          <p className="text-sm text-[#8f8f8f] animate-pulse">Calculando…</p>
        )}
      </PanelCard>
    </div>
  )
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

interface TabAlertasProps {
  ticker: string
}

function TabAlertas({ ticker }: TabAlertasProps) {
  const { data: allAlerts = [], isLoading } = useAlerts()

  const tickerAlerts = useMemo(
    () => allAlerts.filter((a) => a.ticker === ticker),
    [allAlerts, ticker],
  )

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">Alertas — {ticker}</h3>
      {isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : tickerAlerts.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem alertas para este ativo.</p>
      ) : (
        <div className="space-y-3">
          {tickerAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
              <div className="flex-1">
                <p className="text-sm text-white">{alert.title}</p>
                <p className="text-xs text-[#8f8f8f] mt-0.5">{alert.description}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                  alert.status === 'novo'
                    ? 'bg-nf-blue/20 text-nf-blue'
                    : alert.status === 'ignorado'
                    ? 'bg-white/[0.06] text-[#8f8f8f]'
                    : 'bg-white/[0.06] text-white/60'
                }`}
              >
                {alert.status === 'novo' ? 'Novo' : alert.status === 'ignorado' ? 'Ignorado' : 'Lido'}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  )
}

// ─── Visão Geral ──────────────────────────────────────────────────────────────

interface VisaoGeralProps {
  ticker: string
  quantity: number
  avgPrice: number | null
  currentPrice: number | null
  currency: AssetCurrency
  priceHistory: PricePoint[]
  period: WealthPeriod
  onPeriodChange: (p: WealthPeriod) => void
  portfolioWeight: number | null
  dy: number | null
  changeVsAvg: number | null
  valorInvestido: number | null
  ganhoCapital: number | null
  proventos12m: number | null
  rentTotal: number | null
  vscdipp: number | null
  bazin: BazinResult | undefined
  scoreValue: number | null | undefined
  activeScoreName: string | null
  navigate: (path: string) => void
}

function VisaoGeral({
  ticker,
  quantity,
  avgPrice,
  currentPrice,
  currency,
  priceHistory,
  period,
  onPeriodChange,
  portfolioWeight,
  dy,
  changeVsAvg,
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
  bazin,
  scoreValue,
  activeScoreName,
  navigate,
}: VisaoGeralProps) {
  const balance = currentPrice != null ? currentPrice * quantity : null

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <AssetKpiGrid
        quantity={quantity}
        avgPrice={avgPrice}
        balance={balance}
        portfolioWeight={portfolioWeight}
        changeVsAvg={changeVsAvg}
        dy={dy}
        currency={currency}
      />

      {/* Gráfico + Resultado — desktop: 2 colunas; mobile: stack */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Gráfico */}
        <PanelCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Cotação e preço médio</h3>
            <PeriodSelector value={period} onChange={onPeriodChange} periods={PRICE_PERIODS} />
          </div>
          {priceHistory.length > 0 ? (
            <ChartErrorBoundary>
              <PriceLineChartWithAvg data={priceHistory} avgPrice={avgPrice} currency={currency} />
            </ChartErrorBoundary>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
              <p className="text-sm text-[#8f8f8f]">Sem histórico para o período selecionado.</p>
            </div>
          )}
        </PanelCard>

        {/* Resultado da posição */}
        <AssetPositionResult
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
          currency={currency}
        />
      </div>

      {/* Bottom section — desktop: 3 colunas; mobile: stack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AssetTransactionPreview ticker={ticker} navigate={navigate} />
        <AssetDividendPreview ticker={ticker} quantity={quantity} currency={currency} navigate={navigate} />
        <AssetScoreAlerts
          ticker={ticker}
          bazin={bazin}
          scoreValue={scoreValue}
          activeScoreName={activeScoreName}
          navigate={navigate}
        />
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function AtivoDetailPage() {
  const { ticker: rawTicker = '' } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const ticker = rawTicker.toUpperCase()

  const [activeTab, setActiveTab] = useState<AtivoTab>('visao-geral')
  const [period, setPeriod] = useState<WealthPeriod>('1A')

  // ── Dados do ativo ──────────────────────────────────────────────────────────
  const { data: asset, isLoading: assetLoading } = useAssetDetail(ticker)
  const { data: priceHistory = [] } = usePriceHistory(ticker, period)
  const { data: positions = [] } = usePositions()
  const quotesQuery = useLatestQuotes([ticker])
  const { data: fundamentalsList = [] } = useFundamentals([ticker])

  // ── Score ───────────────────────────────────────────────────────────────────
  const { data: allRules = [] } = useScoreRules()
  const { data: preferences } = useScorePreferences()
  const activeRuleId = preferences?.default_score_rule_id ?? null

  const activeScoreName = useMemo(() => {
    if (!activeRuleId) return null
    return allRules.find((r) => r.id === activeRuleId)?.name ?? null
  }, [allRules, activeRuleId])

  const activeRules = useMemo(() => {
    if (!activeScoreName) return []
    return allRules.filter((r) => r.name === activeScoreName)
  }, [allRules, activeScoreName])

  const scoreByTicker = useCalculateScore(activeRules, fundamentalsList)
  const scoreValue = activeScoreName ? (scoreByTicker.get(ticker) ?? null) : undefined

  // ── Bazin ───────────────────────────────────────────────────────────────────
  const bazinCurrencyMap = useMemo(
    () => new Map([[ticker, (asset?.currency ?? 'BRL') as AssetCurrency]]),
    [ticker, asset?.currency],
  )
  const { bazinByTicker } = useBazin([ticker], 0.06, bazinCurrencyMap)
  const bazin = bazinByTicker.get(ticker)

  // ── Cotação e posição ───────────────────────────────────────────────────────
  const quote = useMemo(
    () => (quotesQuery.data ?? []).find((q) => q.ticker === ticker) ?? null,
    [quotesQuery.data, ticker],
  )

  const myPosition = useMemo(
    () => positions.find((p) => p.ticker === ticker) ?? null,
    [positions, ticker],
  )

  const fundamental = fundamentalsList[0] ?? null

  // ── Cor da classe do ativo ──────────────────────────────────────────────────
  const assetType = asset?.type ?? null
  const color = assetType ? assetClassColor(assetType) : '#8f8f8f'

  // ── Variação diária % (vs preço de abertura — usando changePercent do quote se disponível) ──
  // Como LatestQuote não tem open, calculamos changeVsAvg apenas como fallback visual
  // A variação diária real precisaria de open_price — exibimos changeVsAvg como proxy
  const currentPrice = quote ? Number(quote.close) : null
  const avgPrice = myPosition ? Number(myPosition.average_price) : null
  const quantity = myPosition ? Number(myPosition.quantity) : 0

  const changeVsAvg =
    avgPrice != null && currentPrice != null && avgPrice > 0
      ? ((currentPrice - avgPrice) / avgPrice) * 100
      : null

  // ── Peso na carteira ────────────────────────────────────────────────────────
  const totalPortfolioBRL = useMemo(() => {
    return positions.reduce((sum, p) => {
      const q = quotesQuery.data ?? []
      const qt = q.find((qr) => qr.ticker === p.ticker)
      if (!qt) return sum
      return sum + Number(qt.close) * Number(p.quantity)
    }, 0)
  }, [positions, quotesQuery.data])

  const balance = currentPrice != null ? currentPrice * quantity : null
  const portfolioWeight =
    balance != null && totalPortfolioBRL > 0 ? (balance / totalPortfolioBRL) * 100 : null

  // ── Resultado da posição ────────────────────────────────────────────────────
  const valorInvestido = avgPrice != null && quantity > 0 ? avgPrice * quantity : null
  const ganhoCapital =
    currentPrice != null && valorInvestido != null ? currentPrice * quantity - valorInvestido : null

  // Proventos 12M via useDividendTotals
  const quantityByTickerMap = useMemo(() => {
    const m = new Map<string, number>()
    if (myPosition) m.set(ticker, quantity)
    return m
  }, [myPosition, ticker, quantity])
  const dividendTotalsMap = useDividendTotals([ticker], quantityByTickerMap)
  const proventos12m = dividendTotalsMap.get(ticker) ?? 0

  // Rentabilidade vs CDI
  const { summary: perfSummary } = usePerformance('1A')
  const cdiReturnPct = perfSummary.cdiReturnPct

  const rentTotal =
    ganhoCapital != null && valorInvestido != null && valorInvestido > 0
      ? ((ganhoCapital + proventos12m) / valorInvestido) * 100
      : null
  const vscdipp =
    rentTotal != null && cdiReturnPct != null ? rentTotal - cdiReturnPct * 100 : null

  // ── Dividend Yield ──────────────────────────────────────────────────────────
  const dy = fundamental?.dy ?? null

  // ── Estado: loading do ativo ────────────────────────────────────────────────
  if (assetLoading) {
    return (
      <div className="p-8">
        <p className="text-[#8f8f8f] animate-pulse">Carregando ativo…</p>
      </div>
    )
  }

  // ── Ativo não encontrado ────────────────────────────────────────────────────
  if (!asset) {
    return (
      <div className="p-8">
        <PanelCard>
          <div className="p-10 text-center">
            <p className="text-lg font-medium text-white/80 mb-2">
              Ativo não encontrado no catálogo
            </p>
            <p className="text-sm text-[#8f8f8f] mb-6">
              O ticker <span className="font-mono text-white">{ticker}</span> não está no catálogo de
              ativos da plataforma.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Voltar
            </button>
          </div>
        </PanelCard>
      </div>
    )
  }

  const currency = (asset.currency ?? 'BRL') as AssetCurrency
  const assetTypeLabel = asset.type ? assetClassLabel(asset.type) : asset.type

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <AssetDetailHero
        ticker={asset.ticker}
        name={asset.name}
        type={assetTypeLabel}
        color={color}
        currentPrice={currentPrice}
        dailyChangePct={changeVsAvg}
        currency={currency}
        onBack={() => navigate(-1)}
      />

      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <InternalSubTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Conteúdo da tab ─────────────────────────────────────────────── */}
      {activeTab === 'visao-geral' && (
        <VisaoGeral
          ticker={ticker}
          quantity={quantity}
          avgPrice={avgPrice}
          currentPrice={currentPrice}
          currency={currency}
          priceHistory={priceHistory}
          period={period}
          onPeriodChange={setPeriod}
          portfolioWeight={portfolioWeight}
          dy={dy}
          changeVsAvg={changeVsAvg}
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
          bazin={bazin}
          scoreValue={scoreValue}
          activeScoreName={activeScoreName}
          navigate={navigate}
        />
      )}

      {activeTab === 'lancamentos' && (
        <TabLancamentos ticker={ticker} navigate={navigate} />
      )}

      {activeTab === 'proventos' && (
        <TabProventos ticker={ticker} quantity={quantity} currency={currency} />
      )}

      {activeTab === 'rentabilidade' && (
        <TabRentabilidade
          ticker={ticker}
          priceHistory={priceHistory}
          avgPrice={avgPrice}
          currency={currency}
          period={period}
          onPeriodChange={setPeriod}
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
        />
      )}

      {activeTab === 'score' && (
        <TabScore
          ticker={ticker}
          activeScoreName={activeScoreName}
          scoreValue={scoreValue}
          bazin={bazin}
          currency={currency}
        />
      )}

      {activeTab === 'alertas' && <TabAlertas ticker={ticker} />}
    </div>
  )
}
