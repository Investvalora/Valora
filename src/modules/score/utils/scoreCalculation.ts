import type { FundamentalsRow, ScoreByTicker, ScoreMetric, ScoreRule } from '../types'

/**
 * Extrai o valor de uma métrica de uma linha de fundamentals.
 * Retorna `null` quando o campo está ausente ou não é um número finito.
 */
function getMetricValue(row: FundamentalsRow, metric: ScoreMetric): number | null {
  const value = row[metric as keyof FundamentalsRow]
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
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
 * - Ticker com fundamentals → soma dos `points` das regras satisfeitas (pode ser 0).
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

    result.set(ticker, total)
  }

  return result
}
