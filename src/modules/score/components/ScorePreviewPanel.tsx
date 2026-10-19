/**
 * ScorePreviewPanel — pré-visualização em tempo real da regra de score sendo criada/editada.
 * Mostra card da regra, impacto por ativo da carteira ativa e box de impacto total.
 */
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useFundamentals } from '../hooks/useFundamentals'
import { evaluateRule } from '../utils/scoreCalculation'
import { METRIC_LABELS, OPERATOR_LABELS } from '../types'
import type { ScoreMetric, ScoreOperator, ScoreRule, FundamentalsRow } from '../types'

export interface ScorePreviewPanelProps {
  scoreName: string
  metric: ScoreMetric | ''
  operator: ScoreOperator | ''
  thresholdMin: number | null
  thresholdMax: number | null
  points: number | null
  existingRulesInScore: ScoreRule[]
  /** No mobile o card de pré-visualização já é renderizado inline — oculta o card interno */
  hideTitleCard?: boolean
}

function formatCondition(
  metric: ScoreMetric | '',
  operator: ScoreOperator | '',
  thresholdMin: number | null,
  thresholdMax: number | null,
): string {
  if (!metric || !operator || thresholdMin === null || !Number.isFinite(thresholdMin)) {
    return '—'
  }

  const metricLabel = METRIC_LABELS[metric] ?? metric

  if (operator === 'between') {
    const maxStr =
      thresholdMax !== null && Number.isFinite(thresholdMax) ? String(thresholdMax) : '?'
    return `${metricLabel} entre ${thresholdMin} e ${maxStr}`
  }

  const opSymbols: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥' }
  const sym = opSymbols[operator] ?? OPERATOR_LABELS[operator as ScoreOperator] ?? operator
  return `${metricLabel} ${sym} ${thresholdMin}`
}

function getMetricValue(row: FundamentalsRow, metric: ScoreMetric): number | null {
  const value = row[metric as keyof FundamentalsRow]
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

export function ScorePreviewPanel({
  scoreName,
  metric,
  operator,
  thresholdMin,
  thresholdMax,
  points,
  existingRulesInScore,
  hideTitleCard = false,
}: ScorePreviewPanelProps) {
  const { selectedWallet } = useWallets()
  const { data: positions = [], isLoading: positionsLoading } = usePositions(selectedWallet?.id)

  const tickers = Array.from(new Set(positions.map((p) => p.ticker)))
  const { data: fundamentals = [], isLoading: fundLoading } = useFundamentals(tickers)

  const isLoading = positionsLoading || fundLoading

  // Avaliar se a regra está completa o suficiente para preview de ativos
  const isRuleComplete =
    metric !== '' &&
    operator !== '' &&
    thresholdMin !== null &&
    Number.isFinite(thresholdMin) &&
    (operator !== 'between' ||
      (thresholdMax !== null && Number.isFinite(thresholdMax))) &&
    points !== null &&
    Number.isFinite(points)

  const conditionText = formatCondition(metric, operator, thresholdMin, thresholdMax)

  // Montar regra temporária para avaliação
  const tempRule: ScoreRule | null = isRuleComplete
    ? {
        id: '',
        user_id: '',
        created_at: '',
        name: scoreName || 'Novo score',
        metric: metric as ScoreMetric,
        operator: operator as ScoreOperator,
        threshold_min: thresholdMin!,
        threshold_max: operator === 'between' ? thresholdMax : null,
        points: points!,
      }
    : null

  // Mapa de fundamentals por ticker
  const fundMap = new Map<string, FundamentalsRow>()
  for (const row of fundamentals) {
    fundMap.set(row.ticker, row)
  }

  // Calcular impacto por ativo
  type AssetResult = {
    ticker: string
    metricValue: number | null
    meets: boolean
  }

  const assetResults: AssetResult[] = positions.map((pos) => {
    const row = fundMap.get(pos.ticker)
    if (!row || !tempRule || metric === '') {
      return { ticker: pos.ticker, metricValue: null, meets: false }
    }
    const metricValue = getMetricValue(row, metric as ScoreMetric)
    const meets =
      metricValue !== null && evaluateRule(tempRule, metricValue)
    return { ticker: pos.ticker, metricValue, meets }
  })

  // Impacto no score
  const existingCount = existingRulesInScore.length
  const existingPoints = existingRulesInScore.reduce((s, r) => s + r.points, 0)
  const newCount = existingCount + 1
  const newPoints = existingPoints + (points ?? 0)

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      {/* Card da regra */}
      {!hideTitleCard && (
      <div className="bg-[rgba(121,135,255,0.08)] border border-[rgba(121,135,255,0.5)] rounded-[12px] px-[18px] py-[16px] mb-5">
        <p className="text-[#B8C0FF] text-[12px] mb-1 truncate">
          {scoreName || 'Novo score'}
        </p>
        <p className="text-white text-[22px] font-semibold leading-snug mb-3 break-words">
          {conditionText}
        </p>
        <span className="inline-block bg-[rgba(51,170,59,0.18)] text-[#63D16B] px-3 py-1 rounded-[8px] text-[14px] font-semibold">
          {points !== null && Number.isFinite(points)
            ? `${points > 0 ? '+' : ''}${points} pts`
            : '? pts'}
        </span>
      </div>
      )}

      {/* Lista de ativos */}
      {isLoading ? (
        <div className="flex flex-col gap-2 mb-5">
          <p className="text-white/50 text-[12px] mb-2">Como ficaria na sua carteira</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[8px] bg-white/[0.04]" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <p className="text-white/40 text-[12px] mb-5">Sem ativos na carteira ativa.</p>
      ) : (
        <div className="mb-5">
          <p className="text-white/50 text-[12px] mb-3">Como ficaria na sua carteira</p>
          {!isRuleComplete ? (
            <p className="text-white/30 text-[12px]">
              Preencha a regra para ver o impacto por ativo.
            </p>
          ) : (
            <div className="flex flex-col">
              {assetResults.map((item, i) => (
                <div key={item.ticker}>
                  <div className="flex items-center gap-3 py-[10px]">
                    {/* Ícone circular */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        item.meets
                          ? 'bg-[rgba(99,209,107,0.16)] text-[#63D16B]'
                          : 'bg-white/[0.08] text-white/40'
                      }`}
                    >
                      {item.ticker.slice(0, 2)}
                    </div>

                    {/* Ticker + valor */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-white">{item.ticker}</span>
                      {item.metricValue !== null ? (
                        <span className="ml-2 text-[11px] text-white/40">
                          {item.metricValue.toFixed(2)}
                        </span>
                      ) : (
                        <span className="ml-2 text-[11px] text-white/25">N/A</span>
                      )}
                    </div>

                    {/* Status */}
                    {item.meets ? (
                      <span className="text-[11px] font-semibold text-[#63D16B] shrink-0">
                        Atende · +{points}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-white/30 shrink-0">
                        Não atende · 0
                      </span>
                    )}
                  </div>
                  {i < assetResults.length - 1 && (
                    <div className="border-t border-white/[0.07]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Box impacto */}
      <div className="bg-white/[0.04] border border-white/10 rounded-[12px] px-4 py-[14px]">
        <p className="text-white/50 text-[12px] mb-2">Impacto no score</p>
        <p className="text-[13px]">
          <span className="text-white/50">
            {existingCount} {existingCount === 1 ? 'regra' : 'regras'} · {existingPoints > 0 ? '+' : ''}{existingPoints} pontos
          </span>
          <span className="text-white/30 mx-2">→</span>
          <span className="text-white font-semibold">
            {newCount} {newCount === 1 ? 'regra' : 'regras'} · {newPoints > 0 ? '+' : ''}{newPoints} pontos
          </span>
        </p>
      </div>
    </div>
  )
}
