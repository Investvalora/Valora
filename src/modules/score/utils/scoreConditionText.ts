import type { ScoreRule } from '../types'

export function scoreConditionText(rule: Pick<ScoreRule, 'operator' | 'threshold_min' | 'threshold_max'>) {
  const number = (value: number) => value.toLocaleString('pt-BR')
  if (rule.operator === 'between') return `entre ${number(rule.threshold_min)} e ${rule.threshold_max === null ? '—' : number(rule.threshold_max)} (incluindo os limites)`
  const operators = { lt: 'menor que', lte: 'menor ou igual a', gt: 'maior que', gte: 'maior ou igual a' }
  return `${operators[rule.operator]} ${number(rule.threshold_min)}`
}
