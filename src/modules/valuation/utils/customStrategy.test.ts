import { expect, it } from 'vitest'
import { evaluateCustomStrategy, validCustomRules, type CustomStrategyRule } from './customStrategy'
import type { PositionRow } from '../../portfolio/types'
const rules: CustomStrategyRule[] = [{ metric: 'dy', operator: 'gte', min: 6 }, { metric: 'pl', operator: 'lte', min: 10 }]
it('avalia critérios próprios com E, OU e limites inclusivos', () => {
  expect(evaluateCustomStrategy(rules, 'all', { dy: 6, pl: 10 } as PositionRow)).toBe(true)
  expect(evaluateCustomStrategy(rules, 'all', { dy: 6, pl: 11 } as PositionRow)).toBe(false)
  expect(evaluateCustomStrategy(rules, 'any', { dy: 6, pl: 11 } as PositionRow)).toBe(true)
  expect(evaluateCustomStrategy([{ metric: 'roe', operator: 'between', min: 10, max: 20 }], 'all', { roe: 20 } as PositionRow)).toBe(true)
})
it('mantém dados ausentes distintos de reprovação e respeita curto-circuito lógico', () => {
  expect(evaluateCustomStrategy(rules, 'all', { dy: 6, pl: null } as PositionRow)).toBeNull()
  expect(evaluateCustomStrategy(rules, 'any', { dy: 6, pl: null } as PositionRow)).toBe(true)
  expect(evaluateCustomStrategy(rules, 'all', { dy: 5, pl: null } as PositionRow)).toBe(false)
  expect(evaluateCustomStrategy(rules, 'any', { dy: NaN, pl: 11 } as PositionRow)).toBeNull()
})
it('rejeita estratégia vazia, intervalo invertido e valor não finito', () => {
  expect(validCustomRules([])).toBe(false)
  expect(validCustomRules([{ metric: 'dy', operator: 'between', min: 8, max: 6 }])).toBe(false)
  expect(validCustomRules([{ metric: 'dy', operator: 'gt', min: Infinity }])).toBe(false)
})
