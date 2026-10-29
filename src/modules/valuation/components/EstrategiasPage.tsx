import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useInsights, useDeleteInsight } from '../hooks/useInsights'
import { NovoInsightModal } from './NovoInsightModal'
import { ValuationGuide } from './ValuationGuide'
import { StrategyManager } from './StrategyManager'
import { InvestmentCalculators } from './InvestmentCalculators'
import type { StrategyInput } from '../hooks/useStrategies'
import type { InsightRecord, InsightStrategy } from '../types'

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const MISSING = '—'

function formatBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

// ─── MarginIndicator ──────────────────────────────────────────────────────────

function MarginIndicator({
  margin,
  positiveLabel,
  negativeLabel,
}: {
  margin: number | null | undefined
  positiveLabel?: string
  negativeLabel?: string
}) {
  if (margin == null || !Number.isFinite(margin)) {
    return <span className="text-gray-500">{MISSING}</span>
  }
  const isOpp = margin > 0
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${margin === 0 ? 'text-white/60' : isOpp ? 'text-nf-green' : 'text-[#f288ba]'}`}
      aria-label={`${formatPercent(margin)} ${isOpp ? (positiveLabel ?? 'acima') : (negativeLabel ?? 'abaixo')}`}
    >
      <span aria-hidden="true">{isOpp ? '▲' : '▼'}</span>
      {formatPercent(margin)}
    </span>
  )
}

// ─── ExplicacaoCalculo ────────────────────────────────────────────────────────

/** Painel expansível com a conta passo a passo do insight. */
function ExplicacaoCalculo({ insight }: { insight: InsightRecord }) {
  const dyPct = insight.min_dy !== null ? (insight.min_dy * 100).toFixed(1) : '6,0'

  if (insight.strategy === 'bazin') {
    const dividendo = insight.annual_dividend
    const teto = insight.ceiling_price
    const cotacao = insight.current_price
    const margem = insight.margin

    return (
      <div className="px-4 pb-4 text-sm text-gray-300 space-y-3">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Como o Bazin foi calculado
          </p>
          <p className="text-xs text-gray-400">
            O método Bazin estima o <strong className="text-white">preço-teto</strong> — o valor máximo que
            corresponde ao DY desejado caso os proventos se repitam. Uma cotação abaixo do teto
            precisa ser analisada junto à sustentabilidade das distribuições.
          </p>

          <div className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
              <span className="text-gray-400">Dividendo anual (12 meses)</span>
              <span className="text-white">{formatBRL(dividendo)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
              <span className="text-gray-400">DY mínimo desejado</span>
              <span className="text-white">{dyPct}%</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
              <span className="text-gray-400">
                Preço-teto = {formatBRL(dividendo)} ÷ {dyPct}%
              </span>
              <span className="text-white font-semibold">{formatBRL(teto)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
              <span className="text-gray-400">Cotação no momento</span>
              <span className="text-white">{formatBRL(cotacao)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-0.5">
              <span className="text-gray-400">
                Margem = ({formatBRL(teto)} − {formatBRL(cotacao)}) ÷ {formatBRL(teto)} × 100
              </span>
              <MarginIndicator margin={margem} positiveLabel="abaixo do teto" negativeLabel="acima do teto" />
            </div>
          </div>

          <p className="text-xs text-gray-500 pt-1">
            {(margem ?? 0) > 0
              ? `A cotação está ${formatPercent(margem)} abaixo do teto — dentro da margem de segurança Bazin.`
              : `A cotação está ${formatPercent(Math.abs(margem ?? 0))} acima do teto — fora da margem de segurança Bazin.`}
          </p>
          <p className="text-xs text-gray-600">
            Dividendos dos últimos 12 meses via Yahoo Finance · Cotação via price_history
          </p>
        </div>
      </div>
    )
  }

  // Graham
  const lpa = insight.lpa
  const vpa = insight.vpa
  const justo = insight.graham_price
  const cotacao = insight.current_price
  const margem = insight.margin

  return (
    <div className="px-4 pb-4 text-sm text-gray-300 space-y-3">
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-400 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Como o Graham foi calculado
        </p>
        <p className="text-xs text-gray-400">
          O método Graham estima o <strong className="text-white">preço justo</strong> com base no
          lucro e no patrimônio por ação. A fórmula clássica de Benjamin Graham é{' '}
          <span className="font-mono text-white">√(22,5 × LPA × VPA)</span>, onde 22,5 = 15 (P/L
          máximo) × 1,5 (P/VP máximo).
        </p>

        <div className="mt-3 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">LPA (Lucro Por Ação)</span>
            <span className="text-white">{lpa == null ? MISSING : `${lpa.toLocaleString('pt-BR')} ${insight.currency}`}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">VPA (Valor Patrimonial Por Ação)</span>
            <span className="text-white">{vpa == null ? MISSING : `${vpa.toLocaleString('pt-BR')} ${insight.currency}`}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">
              Referência em {insight.currency} = √(22,5 × {lpa ?? MISSING} × {vpa ?? MISSING}); preço exibido em BRL
            </span>
            <span className="text-white font-semibold">{formatBRL(justo)}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">Cotação no momento</span>
            <span className="text-white">{formatBRL(cotacao)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-0.5">
            <span className="text-gray-400">
              Margem = ({formatBRL(justo)} − {formatBRL(cotacao)}) ÷ {formatBRL(justo)} × 100
            </span>
            <MarginIndicator margin={margem} positiveLabel="abaixo do justo" negativeLabel="acima do justo" />
          </div>
        </div>

        <p className="text-xs text-gray-500 pt-1">
          {(margem ?? 0) > 0
            ? `A cotação está ${formatPercent(margem)} abaixo do preço justo — dentro da margem de segurança Graham.`
            : `A cotação está ${formatPercent(Math.abs(margem ?? 0))} acima do preço justo — fora da margem de segurança Graham.`}
        </p>
        <p className="text-xs text-gray-600">
          LPA e VPA via tabela de fundamentais · Cotação via price_history
        </p>
      </div>
    </div>
  )
}

// ─── InsightRow ───────────────────────────────────────────────────────────────

function InsightRow({
  insight,
  onDelete,
  isDeleting,
}: {
  insight: InsightRecord
  onDelete: () => void
  isDeleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const CELL = 'px-3 py-4 text-xs text-white/80'
  const CELL_RIGHT = `${CELL} text-right`

  const refPrice = insight.strategy === 'bazin' ? insight.ceiling_price : insight.graham_price
  const strategyLabel = insight.strategy === 'bazin' ? 'Bazin' : 'Graham'
  const strategyColor = insight.strategy === 'bazin' ? 'text-blue-400' : 'text-purple-400'

  return (
    <>
      <tr
        className="border-t border-dark-border hover:bg-dark-surface/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <th scope="row" className={`${CELL} font-semibold text-white text-left`}>
          <span className="flex items-center gap-1.5">
            {insight.ticker}
            {insight.currency === 'USD' && (
              <span className="text-xs text-gray-500 font-normal">USD→BRL</span>
            )}
          </span>
        </th>
        <td className={CELL}><span className={`text-xs ${strategyColor}`}>{strategyLabel}</span></td>
        <td className={CELL}>{insight.strategy === 'bazin' && insight.min_dy !== null ? `${(insight.min_dy * 100).toLocaleString('pt-BR')}%` : MISSING}</td>
        <td className={CELL_RIGHT}>{formatBRL(refPrice)}</td>
        <td className={CELL_RIGHT}>{formatBRL(insight.current_price)}</td>
        <td className={CELL_RIGHT}>
          <MarginIndicator
            margin={insight.margin}
            positiveLabel={insight.strategy === 'bazin' ? 'abaixo do teto' : 'abaixo do justo'}
            negativeLabel={insight.strategy === 'bazin' ? 'acima do teto' : 'acima do justo'}
          />
        </td>
        <td className="px-4 py-3 text-right">
          <span className="inline-flex items-center gap-2">
            <button type="button" aria-label={`${expanded ? 'Ocultar' : 'Ver'} cálculo de ${insight.ticker}`} aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); setExpanded(!expanded) }} className="rounded p-1 text-white/40 hover:text-white" title={`Criado em ${dateFormatter.format(new Date(insight.created_at))}`}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label={`Remover insight de ${insight.ticker}`}
              className="text-gray-500 hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        </td>
      </tr>

      {/* Painel expansível com a explicação do cálculo */}
      {expanded && (
        <tr className="border-t border-dark-border bg-dark-bg/50">
          <td colSpan={7} className="p-0">
            <ExplicacaoCalculo insight={insight} />
          </td>
        </tr>
      )}
    </>
  )
}

// ─── InsightsList ─────────────────────────────────────────────────────────────

function InsightsList() {
  const { data: insights = [], isLoading, isError } = useInsights()
  const deleteInsight = useDeleteInsight()
  const [showAll, setShowAll] = useState(false)

  if (isLoading) {
    return <p className="text-sm text-gray-400 animate-pulse py-4">Carregando insights…</p>
  }

  if (isError) {
    return <p className="text-sm text-red-400 py-4">Não foi possível carregar os insights.</p>
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-dark-border p-10 text-center">
        <p className="text-gray-400 font-medium">Nenhum insight salvo ainda</p>
        <p className="text-gray-500 text-sm mt-1">
          Clique em "Novo Insight" para analisar qualquer ativo com Bazin ou Graham.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-5 lg:p-6">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-medium text-white">{showAll ? 'Todos os insights' : 'Insights recentes'}</h2>{insights.length > 5 && <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs text-[#a0a7ff] hover:underline">{showAll ? 'Ver recentes' : 'Ver todos'} <span aria-hidden="true">›</span></button>}</div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Insights salvos</caption>
        <thead>
          <tr>
            <th scope="col" className="px-3 pb-3 text-left text-[11px] font-normal text-white/40">Ativo</th>
            <th scope="col" className="px-3 pb-3 text-left text-[11px] font-normal text-white/40">Estratégia</th>
            <th scope="col" className="px-3 pb-3 text-left text-[11px] font-normal text-white/40">DY mínimo</th>
            <th scope="col" className="px-3 pb-3 text-right text-[11px] font-normal text-white/40">Preço de referência</th>
            <th scope="col" className="px-3 pb-3 text-right text-[11px] font-normal text-white/40">Cotação</th>
            <th scope="col" className="px-3 pb-3 text-right text-[11px] font-normal text-white/40">Margem de segurança</th>
            <th scope="col" className="px-4 py-3 w-16" aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {(showAll ? insights : insights.slice(0, 5)).map((insight) => (
            <InsightRow
              key={insight.id}
              insight={insight}
              onDelete={() => deleteInsight.mutate(insight.id)}
              isDeleting={deleteInsight.isPending}
            />
          ))}
        </tbody>
      </table>
      </div>
      <p className="mt-3 text-[11px] text-white/35">
        Clique em uma linha para ver como o cálculo foi feito.
      </p>
    </section>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export function EstrategiasPage() {
  const [showInsightModal, setShowInsightModal] = useState(false)
  const [insightMethod, setInsightMethod] = useState<InsightStrategy>('bazin')
  const [strategyPreset, setStrategyPreset] = useState<{ key: number; draft: StrategyInput } | null>(null)
  function openInsight(method: InsightStrategy) {
    setInsightMethod(method)
    setShowInsightModal(true)
  }

  return (
    <div className="flex w-full flex-col gap-5 md:pt-2">

      {/* Intro: subtítulo + ação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-white/45">
          Crie seus critérios de análise ou compare referências de preço com Bazin e Graham.
        </p>
        <button
          type="button"
          onClick={() => openInsight('bazin')}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-[#393939] px-4 py-2 text-xs text-white transition-colors hover:bg-[#484848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0a7ff]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo Insight
        </button>
      </div>

      <StrategyManager key={strategyPreset?.key ?? 'default'} initialDraft={strategyPreset?.draft} />
      <ValuationGuide onCalculate={openInsight} />
      <InvestmentCalculators onUseYield={(yieldRate, parameters) => setStrategyPreset({ key: Date.now(), draft: { name: 'Preço-teto de FIIs', method: 'fii', min_dy: yieldRate, safety_discount: 0, show_in_assets: true, ...parameters } })} />
      {/* Lista de insights */}
      <InsightsList />

      {/* Modal */}
      {showInsightModal && (
        <NovoInsightModal initialStrategy={insightMethod} onClose={() => setShowInsightModal(false)} />
      )}
    </div>
  )
}
