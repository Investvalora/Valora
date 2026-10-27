import type { PositionRow } from '../../portfolio/types'

export const CUSTOM_METRICS = {
  pl: 'P/L', pvp: 'P/VP', dy: 'DY (%)', roe: 'ROE (%)', netMargin: 'Margem líquida (%)',
  quotePrice: 'Preço atual (moeda do ativo)', weightPercent: 'Peso na carteira (%)',
} as const
export const CUSTOM_OPERATORS = { lt: 'menor que', lte: 'menor ou igual a', gt: 'maior que', gte: 'maior ou igual a', between: 'entre' } as const
export interface CustomStrategyRule {
  metric: keyof typeof CUSTOM_METRICS
  operator: keyof typeof CUSTOM_OPERATORS
  min: number
  max?: number
}
export function validCustomRules(rules: CustomStrategyRule[]): boolean {
  return rules.length > 0 && rules.length <= 20 && rules.every((rule) =>
    rule.metric in CUSTOM_METRICS && rule.operator in CUSTOM_OPERATORS && Number.isFinite(rule.min)
    && (rule.operator !== 'between' || (Number.isFinite(rule.max) && rule.max! >= rule.min)))
}

/** Dados ausentes não significam reprovação. Em OU, uma condição verdadeira basta. */
export function evaluateCustomStrategy(rules: CustomStrategyRule[], match: 'all' | 'any', row: PositionRow): boolean | null {
  if (!validCustomRules(rules)) return null
  const outcomes = rules.map((rule): boolean | null => {
    const value = row[rule.metric]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    if (rule.operator === 'lt') return value < rule.min
    if (rule.operator === 'lte') return value <= rule.min
    if (rule.operator === 'gt') return value > rule.min
    if (rule.operator === 'gte') return value >= rule.min
    return value >= rule.min && value <= rule.max!
  })
  if (match === 'all' && outcomes.includes(false)) return false
  if (match === 'any' && outcomes.includes(true)) return true
  if (outcomes.includes(null)) return null
  return match === 'all'
}
