import type { FundamentalsRow, ScoreByTicker, ScoreMetric, ScoreRule } from '../types'
import { indicatorValue } from '../../../shared/indicators/catalog'

/**
 * Extrai o valor de uma métrica de uma linha de fundamentals.
 * Retorna `null` quando o campo está ausente ou não é um número finito.
 */
export function getMetricValue(row: FundamentalsRow, metric: ScoreMetric): number | null {
  return indicatorValue(row, metric)
}

/** Same rules and cap as the existing score, with missing data distinguished. */
export function explainScore(rules: ScoreRule[], row: FundamentalsRow | null) {
  const criteria = rules.map(rule => {
    const value = row ? getMetricValue(row, rule.metric) : null
    const met = value === null ? null : evaluateRule(rule, value)
    return { rule, value, met, contribution: met ? rule.points : 0 }
  })
  const raw = criteria.reduce((sum, item) => sum + item.contribution, 0)
  return { criteria, raw, total: row && rules.length ? Math.min(100, Math.max(0, raw)) : null }
}

/** Market-value weighting in BRL. Unknown scores never become zero. */
export function weightedPortfolioScore(
  rows: Array<{ ticker: string; marketValueBRL: number | null }>,
  scores: ScoreByTicker,
) {
  let total = 0, covered = 0, weighted = 0
  for (const row of rows) {
    const value = row.marketValueBRL
    if (value === null || !Number.isFinite(value) || value < 0) return { score: null, coverage: null }
    total += value
    const score = scores.get(row.ticker)
    if (score != null && Number.isFinite(score)) {
      covered += value
      weighted += value * score
    }
  }
  return { score: covered > 0 ? weighted / covered : null, coverage: total > 0 ? covered / total * 100 : null }
}

/**
 * Avalia se um valor satisfaz a condição de uma regra.
 *
 * - `lt`:      value < threshold_min
 * - `lte`:     value ≤ threshold_min
 * - `gt`:      value > threshold_min
 * - `gte`:     value ≥ threshold_min
 * - `between`: threshold_min ≤ value ≤ threshold_max
 *
 * Retorna `false` para valores não finitos ou threshold_max nulo em `between`.
 */
export function evaluateRule(rule: ScoreRule, value: number): boolean {
  if (!Number.isFinite(value)) return false

  const { operator, threshold_min: min, threshold_max: max } = rule

  if (operator === 'lt') return value < min
  if (operator === 'lte') return value <= min
  if (operator === 'gt') return value > min
  if (operator === 'gte') return value >= min
  if (operator === 'between') return max !== null && value >= min && value <= max

  return false
}

/**
 * Aplica um conjunto de regras de score sobre os fundamentals e retorna o
 * score total por ticker.
 *
 * - Ticker sem fundamentals → `null` (dado indisponível, exibe "N/A").
 * - Ticker com fundamentals → soma dos pontos satisfeitos, limitada a 0–100.
 * - Métricas com valor `null` nos fundamentals contam como regra não satisfeita.
 *
 * A função é pura: não acessa banco, não lança exceções, não tem efeitos colaterais.
 */
export function applyScoreRules(
  rules: ScoreRule[],
  fundamentals: FundamentalsRow[],
): ScoreByTicker {
  const result: ScoreByTicker = new Map()

  if (fundamentals.length === 0) return result

  const fundsByTicker = new Map<string, FundamentalsRow>()
  for (const row of fundamentals) {
    fundsByTicker.set(row.ticker, row)
  }

  for (const [ticker, row] of fundsByTicker) {
    let total = 0

    for (const rule of rules) {
      const value = getMetricValue(row, rule.metric)
      if (value !== null && evaluateRule(rule, value)) {
        total += rule.points
      }
    }

    // Preserva pontos e penalidades configurados, limitando apenas o resultado.
    result.set(ticker, Math.min(100, Math.max(0, total)))
  }

  return result
}
