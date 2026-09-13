import { lazy, Suspense, useMemo, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tooltip } from '../../../shared/components/Tooltip'
import { PeriodSelector } from '../../wealth/components/PeriodSelector'
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
import type { WealthPeriod } from '../../wealth/types'

const PriceLineChart = lazy(() => import('./PriceLineChart'))

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
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const MISSING = '—'

function fmtMoney(value: number | null | undefined, currency = 'BRL'): string {
  if (value == null || !Number.isFinite(value)) return MISSING
  return currency === 'USD' ? usdFormatter.format(value) : brlFormatter.format(value)
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return MISSING
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFormatter.format(d)
}

function fmtTimestamp(iso: string | null | undefined): string {
  if (!iso) return MISSING
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : timestampFormatter.format(d)
}

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
        <div className="flex h-[260px] items-center justify-center rounded-lg border border-dark-border">
          <p className="text-sm text-gray-400">Gráfico indisponível.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Helpers de seção ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-dark-border bg-dark-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

function FundamentalsRow({
  label,
  value,
}: {
  label: string
  value: number | null | undefined
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-dark-border last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white tabular-nums">
        {value != null && Number.isFinite(value) ? value.toFixed(2) : MISSING}
      </span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PRICE_PERIODS: WealthPeriod[] = ['1M', '3M', '6M', '1A', 'Tudo']

export function AtivoDetailPage() {
  const { ticker: rawTicker = '' } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const ticker = rawTicker.toUpperCase()

  const [period, setPeriod] = useState<WealthPeriod>('1A')

  // ── Dados do ativo ──────────────────────────────────────────────────────────
  const { data: asset, isLoading: assetLoading } = useAssetDetail(ticker)
  const { data: priceHistory = [] } = usePriceHistory(ticker, period)
  const { data: dividends = [], isLoading: divLoading, isError: divError, refetch: refetchDiv } =
    useAssetDividends(ticker)
  const { data: positions = [] } = usePositions()
  const quotesQuery = useLatestQuotes([ticker])
  const { data: fundamentalsList = [], isLoading: fundLoading } = useFundamentals([ticker])

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
  const { bazinByTicker } = useBazin([ticker], 0.06)
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

  // ── Estado: loading do ativo ────────────────────────────────────────────────
  if (assetLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-400 animate-pulse">Carregando ativo…</p>
      </div>
    )
  }

  // ── Ativo não encontrado ────────────────────────────────────────────────────
  if (!asset) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-dark-border bg-dark-surface p-10 text-center">
          <p className="text-lg font-medium text-gray-300 mb-2">
            Ativo não encontrado no catálogo
          </p>
          <p className="text-sm text-gray-400 mb-6">
            O ticker <span className="font-mono text-white">{ticker}</span> não está no catálogo de
            ativos da plataforma.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-dark-border px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  // ── Tela completa ────────────────────────────────────────────────────────────
  const currency = asset.currency ?? 'BRL'
  const currentPrice = quote ? Number(quote.close) : null

  // Variação vs. preço médio da posição
  const changeVsAvg =
    myPosition && currentPrice && Number.isFinite(Number(myPosition.average_price)) && Number(myPosition.average_price) > 0
      ? ((currentPrice - Number(myPosition.average_price)) / Number(myPosition.average_price)) * 100
      : null

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <span className="font-mono text-2xl font-bold text-white">{asset.ticker}</span>
          <span className="rounded-full border border-dark-border px-2 py-0.5 text-xs text-gray-400 uppercase">
            {asset.type}
          </span>
          <span className="rounded-full border border-dark-border px-2 py-0.5 text-xs text-gray-400">
            {asset.currency}
          </span>
        </div>
        <p className="text-gray-300 text-lg mb-3">{asset.name}</p>

        {/* Cotação */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-3xl font-bold text-white tabular-nums">
            {fmtMoney(currentPrice, currency)}
          </span>
          {quote && (
            <Tooltip label={`Procedência da cotação de ${ticker}`}>
              <span className="block font-semibold text-white">Cotação de {ticker}</span>
              <span className="mt-1 block text-sm">Fonte: {quote.source || MISSING}</span>
              <span className="block text-sm">Fechamento: {fmtDate(quote.date)}</span>
              <span className="block text-sm">
                Registrado em: {fmtTimestamp(quote.updated_at)}
              </span>
            </Tooltip>
          )}
          {!quote && !quotesQuery.isLoading && (
            <span className="text-sm text-gray-500">Cotação indisponível</span>
          )}
        </div>
      </div>

      {/* ── Gráfico de preços ──────────────────────────────────────────────── */}
      <SectionCard title="Histórico de Preços">
        <div className="flex justify-end mb-3">
          <PeriodSelector value={period} onChange={setPeriod} periods={PRICE_PERIODS} />
        </div>
        {priceHistory.length > 0 ? (
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-[260px] items-center justify-center">
                  <p className="text-sm text-gray-400 animate-pulse">Carregando gráfico…</p>
                </div>
              }
            >
              <PriceLineChart data={priceHistory} currency={currency} />
            </Suspense>
          </ChartErrorBoundary>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-dark-border">
            <p className="text-sm text-gray-400">
              Sem histórico de preços para o período selecionado.
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── Fundamentals ──────────────────────────────────────────────────── */}
      <SectionCard title="Indicadores Fundamentalistas">
        {fundLoading ? (
          <p className="text-sm text-gray-400 animate-pulse">Carregando…</p>
        ) : fundamental ? (
          <div>
            <div className="grid grid-cols-2 gap-x-8">
              <FundamentalsRow label="P/L" value={fundamental.pl} />
              <FundamentalsRow label="P/VP" value={fundamental.pvp} />
              <FundamentalsRow label="ROE (%)" value={fundamental.roe} />
              <FundamentalsRow label="DY (%)" value={fundamental.dy} />
              <FundamentalsRow label="Dívida/PL" value={fundamental.debt_equity} />
              <FundamentalsRow label="Margem Líquida (%)" value={fundamental.net_margin} />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Referência: {fmtDate(fundamental.reference_date)} · Atualizado em:{' '}
              {fmtTimestamp(fundamental.updated_at)} · Fonte: seed
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sem dados fundamentalistas disponíveis.</p>
        )}
      </SectionCard>

      {/* ── Dividendos ────────────────────────────────────────────────────── */}
      <SectionCard title="Histórico de Dividendos">
        {divLoading ? (
          <p className="text-sm text-gray-400 animate-pulse">Carregando…</p>
        ) : divError ? (
          <div>
            <p className="text-sm text-red-400 mb-2">Erro ao carregar dividendos.</p>
            <button
              type="button"
              onClick={() => refetchDiv()}
              className="text-sm underline text-red-300 hover:text-red-200"
            >
              Tentar novamente
            </button>
          </div>
        ) : dividends.length === 0 ? (
          <p className="text-sm text-gray-400">Sem histórico de dividendos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Data COM
                  </th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Tipo
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Valor por cota
                  </th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d, i) => (
                  <tr
                    key={`${d.ticker}-${d.ex_date}-${d.type}-${i}`}
                    className="border-b border-dark-border/50 last:border-0"
                  >
                    <td className="py-2 text-gray-300">{fmtDate(d.ex_date)}</td>
                    <td className="py-2 text-gray-400 uppercase text-xs">{d.type}</td>
                    <td className="py-2 text-right font-mono text-white">
                      {fmtMoney(Number(d.value_per_share), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dividends.length === 500 && (
              <p className="mt-2 text-xs text-gray-500">
                Exibindo os 500 registros mais recentes.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Score ────────────────────────────────────────────────────────── */}
      {activeScoreName && (
        <SectionCard title="Score Fundamentalista">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Score ativo:</span>
            <span className="font-medium text-white">{activeScoreName}</span>
            <span className="text-2xl font-bold tabular-nums text-white">
              {scoreValue === undefined ? (
                <span className="text-sm text-gray-400">Nenhum score selecionado</span>
              ) : scoreValue === null ? (
                <span className="text-sm text-gray-500">N/A</span>
              ) : (
                <span className={scoreValue > 0 ? 'text-green-400' : scoreValue < 0 ? 'text-red-400' : 'text-gray-200'}>
                  {scoreValue > 0 ? `+${scoreValue}` : scoreValue}
                </span>
              )}
            </span>
          </div>
          {scoreValue === null && (
            <p className="text-xs text-gray-500 mt-1">
              Sem dados fundamentalistas para calcular o score deste ativo.
            </p>
          )}
        </SectionCard>
      )}

      {/* ── Preço-Teto Bazin ──────────────────────────────────────────────── */}
      <SectionCard title="Preço-Teto Bazin (DY 6%)">
        {bazin ? (
          bazin.hasData ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Dividendo 12M</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.annualDividend, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Preço-Teto</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.ceilingPrice, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Cotação</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.currentPrice, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Margem</p>
                <p
                  className={`font-semibold tabular-nums ${
                    bazin.margin === null
                      ? 'text-gray-400'
                      : bazin.margin > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}
                >
                  {bazin.margin !== null ? fmtPct(bazin.margin) : MISSING}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Sem histórico de dividendos nos últimos 12 meses para calcular o preço-teto.
            </p>
          )
        ) : (
          <p className="text-sm text-gray-400 animate-pulse">Calculando…</p>
        )}
      </SectionCard>

      {/* ── Minha Posição ─────────────────────────────────────────────────── */}
      <SectionCard title="Minha Posição">
        {myPosition ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Quantidade</p>
              <p className="font-semibold text-white tabular-nums">
                {Number(myPosition.quantity).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Preço médio</p>
              <p className="font-semibold text-white tabular-nums">
                {fmtMoney(Number(myPosition.average_price), currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Valor de mercado</p>
              <p className="font-semibold text-white tabular-nums">
                {currentPrice
                  ? fmtMoney(currentPrice * Number(myPosition.quantity), currency)
                  : MISSING}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Variação vs. PM</p>
              <p
                className={`font-semibold tabular-nums ${
                  changeVsAvg === null
                    ? 'text-gray-400'
                    : changeVsAvg > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                }`}
              >
                {changeVsAvg !== null ? fmtPct(changeVsAvg) : MISSING}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-400">
              Você não tem posição neste ativo.
            </p>
            <button
              type="button"
              onClick={() => navigate('/carteira')}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              + Adicionar à Carteira
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
