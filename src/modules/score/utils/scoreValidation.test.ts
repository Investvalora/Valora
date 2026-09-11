import { describe, it, expect } from 'vitest'
import { scoreRuleSchema } from './scoreValidation'

const BASE_VALID = {
  name: 'Meu Score',
  metric: 'pl' as const,
  operator: 'gte' as const,
  threshold_min: 5,
  threshold_max: null,
  points: 10,
}

describe('scoreRuleSchema', () => {
  // Happy path — operador não-between
  it('aceita regra válida com operador gte', () => {
    const result = scoreRuleSchema.safeParse(BASE_VALID)
    expect(result.success).toBe(true)
  })

  it('aceita regra válida com operador lt', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, operator: 'lt', threshold_min: 15 })
    expect(result.success).toBe(true)
  })

  it('aceita regra válida com operador between e threshold_max > threshold_min', () => {
    const result = scoreRuleSchema.safeParse({
      ...BASE_VALID,
      operator: 'between',
      threshold_min: 5,
      threshold_max: 20,
    })
    expect(result.success).toBe(true)
  })

  // Between sem threshold_max
  it('rejeita between sem threshold_max', () => {
    const result = scoreRuleSchema.safeParse({
      ...BASE_VALID,
      operator: 'between',
      threshold_max: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('threshold_max')
    }
  })

  it('rejeita between com threshold_max undefined', () => {
    const result = scoreRuleSchema.safeParse({
      ...BASE_VALID,
      operator: 'between',
      threshold_max: undefined,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('threshold_max')
    }
  })

  it('rejeita between com threshold_max <= threshold_min', () => {
    const result = scoreRuleSchema.safeParse({
      ...BASE_VALID,
      operator: 'between',
      threshold_min: 10,
      threshold_max: 5,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('threshold_max')
    }
  })

  // Points não inteiro
  it('rejeita points decimal (1.5)', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, points: 1.5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('points'))
      expect(issue?.message).toMatch(/inteiro/i)
    }
  })

  it('aceita points negativo inteiro', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, points: -5 })
    expect(result.success).toBe(true)
  })

  it('aceita points zero', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, points: 0 })
    expect(result.success).toBe(true)
  })

  // Nome obrigatório
  it('rejeita nome vazio', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('name')
    }
  })

  // Todos os valores válidos de metric
  it.each(['pl', 'pvp', 'roe', 'dy', 'debt_equity', 'net_margin'] as const)(
    'aceita metric "%s"',
    (metric) => {
      const result = scoreRuleSchema.safeParse({ ...BASE_VALID, metric })
      expect(result.success).toBe(true)
    },
  )

  // Todos os valores válidos de operator (não-between)
  it.each(['lt', 'lte', 'gt', 'gte'] as const)('aceita operator "%s"', (operator) => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, operator })
    expect(result.success).toBe(true)
  })

  // Operador não-between com threshold_max preenchido — deve ser ignorado/aceito
  // (a spec diz que o form envia null para não-between; o schema não proíbe explicitamente)
  it('aceita threshold_max null em operador gte', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, threshold_max: null })
    expect(result.success).toBe(true)
  })

  // Metric inválida
  it('rejeita metric inválida', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, metric: 'ebitda' })
    expect(result.success).toBe(false)
  })

  // Operator inválido
  it('rejeita operator inválido', () => {
    const result = scoreRuleSchema.safeParse({ ...BASE_VALID, operator: 'eq' })
    expect(result.success).toBe(false)
  })
})
