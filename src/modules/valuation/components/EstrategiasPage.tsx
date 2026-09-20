import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useInsights, useDeleteInsight } from '../hooks/useInsights'
import { NovoInsightModal } from './NovoInsightModal'
import type { InsightRecord } from '../types'

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
      className={`inline-flex items-center gap-1 font-semibold ${isOpp ? 'text-green-400' : 'text-red-400'}`}
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
            vale pagar por um ativo com base no dividendo que ele distribui. Se a cotação estiver
            abaixo do teto, o ativo está numa faixa de oportunidade.
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
                Margem = ({formatBRL(teto)} − {formatBRL(cotacao)}) ÷ {formatBRL(cotacao)}
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
            <span className="text-white">{formatBRL(lpa)}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">VPA (Valor Patrimonial Por Ação)</span>
            <span className="text-white">{formatBRL(vpa)}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">
              Preço justo = √(22,5 × {formatBRL(lpa)} × {formatBRL(vpa)})
            </span>
            <span className="text-white font-semibold">{formatBRL(justo)}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-dark-border pb-1">
            <span className="text-gray-400">Cotação no momento</span>
            <span className="text-white">{formatBRL(cotacao)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-0.5">
            <span className="text-gray-400">
              Margem = ({formatBRL(justo)} − {formatBRL(cotacao)}) ÷ {formatBRL(cotacao)}
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

  const CELL = 'px-4 py-3 text-sm text-gray-200'
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
        <td className={CELL}>
          <span className={`text-xs font-semibold ${strategyColor}`}>{strategyLabel}</span>
          {insight.strategy === 'bazin' && insight.min_dy !== null && (
            <span className="text-xs text-gray-500 ml-1">
              DY {(insight.min_dy * 100).toFixed(0)}%
            </span>
          )}
        </td>
        <td className={CELL_RIGHT}>{formatBRL(refPrice)}</td>
        <td className={CELL_RIGHT}>{formatBRL(insight.current_price)}</td>
        <td className={CELL_RIGHT}>
          <MarginIndicator
            margin={insight.margin}
            positiveLabel={insight.strategy === 'bazin' ? 'abaixo do teto' : 'abaixo do justo'}
            negativeLabel={insight.strategy === 'bazin' ? 'acima do teto' : 'acima do justo'}
          />
        </td>
        <td className={`${CELL_RIGHT} text-xs text-gray-500`}>
          {dateFormatter.format(new Date(insight.created_at))}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="inline-flex items-center gap-2">
            <span className="text-gray-500" aria-hidden="true">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
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
    <div className="overflow-x-auto rounded-xl border border-dark-border">
      <table className="w-full border-collapse">
        <caption className="sr-only">Insights salvos</caption>
        <thead className="bg-dark-bg">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Ativo</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Estratégia</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Preço de referência</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Cotação</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Margem</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Criado em</th>
            <th scope="col" className="px-4 py-3 w-16" aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {insights.map((insight) => (
            <InsightRow
              key={insight.id}
              insight={insight}
              onDelete={() => deleteInsight.mutate(insight.id)}
              isDeleting={deleteInsight.isPending}
            />
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-gray-600 border-t border-dark-border">
        Clique em uma linha para ver como o cálculo foi feito.
      </p>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export function EstrategiasPage() {
  const [showInsightModal, setShowInsightModal] = useState(false)

  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Estratégias</h1>
          <p className="text-gray-400 text-sm">
            Analise qualquer ativo com os métodos Bazin e Graham. Clique num insight para ver a conta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInsightModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo Insight
        </button>
      </div>

      {/* Lista de insights */}
      <InsightsList />

      {/* Modal */}
      {showInsightModal && (
        <NovoInsightModal onClose={() => setShowInsightModal(false)} />
      )}
    </div>
  )
}
