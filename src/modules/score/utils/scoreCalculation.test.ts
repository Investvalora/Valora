import { describe, it, expect } from 'vitest'
import { applyScoreRules, evaluateRule } from './scoreCalculation'
import type { FundamentalsRow, ScoreRule } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function rule(
  overrides: Partial<ScoreRule> & { metric: ScoreRule['metric']; operator: ScoreRule['operator'] },
): ScoreRule {
  return {
    id: 'test-id',
    user_id: 'user-1',
    name: 'Test Score',
    threshold_min: 10,
    threshold_max: null,
    points: 10,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function fund(ticker: string, overrides: Partial<FundamentalsRow> = {}): FundamentalsRow {
  return {
    ticker,
    reference_date: '2025-12-31',
    pl: 15,
    pvp: 1.5,
    roe: 12,
    dy: 6,
    debt_equity: 0.5,
    net_margin: 20,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── evaluateRule ──────────────────────────────────────────────────────────────

describe('evaluateRule', () => {
  it('lt: verdadeiro quando value < threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'lt', threshold_min: 20 }), 15)).toBe(true)
  })

  it('lt: falso quando value === threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'lt', threshold_min: 15 }), 15)).toBe(false)
  })

  it('lte: verdadeiro quando value === threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'lte', threshold_min: 15 }), 15)).toBe(true)
  })

  it('gt: verdadeiro quando value > threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'roe', operator: 'gt', threshold_min: 10 }), 12)).toBe(true)
  })

  it('gt: falso quando value === threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'roe', operator: 'gt', threshold_min: 12 }), 12)).toBe(false)
  })

  it('gte: verdadeiro quando value === threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'roe', operator: 'gte', threshold_min: 12 }), 12)).toBe(true)
  })

  it('gte: verdadeiro quando value > threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'gte', threshold_min: 10 }), 15)).toBe(true)
  })

  it('gte: falso quando value < threshold_min', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'gte', threshold_min: 20 }), 15)).toBe(false)
  })

  it('between: verdadeiro quando value está dentro [min, max]', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 5, threshold_max: 15 }),
        6,
      ),
    ).toBe(true)
  })

  it('between: verdadeiro no limite inferior', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 6, threshold_max: 15 }),
        6,
      ),
    ).toBe(true)
  })

  it('between: verdadeiro no limite superior', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 5, threshold_max: 6 }),
        6,
      ),
    ).toBe(true)
  })

  it('between: falso quando value < min', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 7, threshold_max: 15 }),
        6,
      ),
    ).toBe(false)
  })

  it('between: falso quando value > max', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 1, threshold_max: 5 }),
        6,
      ),
    ).toBe(false)
  })

  it('between: falso quando threshold_max é null (invariante do banco não satisfeito)', () => {
    expect(
      evaluateRule(
        rule({ metric: 'dy', operator: 'between', threshold_min: 5, threshold_max: null }),
        6,
      ),
    ).toBe(false)
  })

  it('retorna false para value não finito (NaN)', () => {
    expect(evaluateRule(rule({ metric: 'pl', operator: 'gte', threshold_min: 10 }), NaN)).toBe(
      false,
    )
  })

  it('retorna false para value Infinity', () => {
    expect(
      evaluateRule(rule({ metric: 'pl', operator: 'gte', threshold_min: 10 }), Infinity),
    ).toBe(false)
  })
})

// ─── applyScoreRules ───────────────────────────────────────────────────────────

describe('applyScoreRules', () => {
  const ruleGte10 = rule({ metric: 'pl', operator: 'gte', threshold_min: 10, points: 20 })
  const ruleLt5 = rule({ metric: 'dy', operator: 'lt', threshold_min: 5, points: 10 })

  it('retorna mapa vazio quando fundamentals está vazio', () => {
    const result = applyScoreRules([ruleGte10], [])
    expect(result.size).toBe(0)
  })

  it('soma pontos das regras satisfeitas para um ticker', () => {
    // pl=15 >= 10 → 20pts; dy=3 < 5 → 10pts
    const result = applyScoreRules([ruleGte10, ruleLt5], [fund('PETR3', { pl: 15, dy: 3 })])
    expect(result.get('PETR3')).toBe(30)
  })

  it('score = 0 quando nenhuma regra é satisfeita', () => {
    // pl=5 < 10 → não satisfaz gte; dy=8 >= 5 → não satisfaz lt
    const result = applyScoreRules([ruleGte10, ruleLt5], [fund('VALE3', { pl: 5, dy: 8 })])
    expect(result.get('VALE3')).toBe(0)
  })

  it('ticker sem fundamentals → não aparece no resultado (null implícito por ausência)', () => {
    const result = applyScoreRules([ruleGte10], [fund('PETR3')])
    expect(result.has('VALE3')).toBe(false)
  })

  it('métrica com valor null nos fundamentals não conta pontos', () => {
    const result = applyScoreRules([ruleGte10], [fund('PETR3', { pl: null })])
    expect(result.get('PETR3')).toBe(0)
  })

  it('score com 0 regras retorna 0 para todos os tickers', () => {
    const result = applyScoreRules([], [fund('PETR3'), fund('VALE3')])
    expect(result.get('PETR3')).toBe(0)
    expect(result.get('VALE3')).toBe(0)
  })

  it('processa múltiplos tickers independentemente', () => {
    const result = applyScoreRules(
      [ruleGte10],
      [fund('PETR3', { pl: 20 }), fund('VALE3', { pl: 5 }), fund('ITUB4', { pl: 10 })],
    )
    expect(result.get('PETR3')).toBe(20) // pl=20 >= 10
    expect(result.get('VALE3')).toBe(0)  // pl=5 < 10
    expect(result.get('ITUB4')).toBe(20) // pl=10 >= 10 (limite inclusivo)
  })

  it('pontos negativos são subtraídos do total', () => {
    const rulePenalty = rule({ metric: 'debt_equity', operator: 'gt', threshold_min: 1, points: -10 })
    // debt_equity=2 > 1 → -10 pts; pl=15 >= 10 → +20 pts
    const result = applyScoreRules(
      [ruleGte10, rulePenalty],
      [fund('MGLU3', { pl: 15, debt_equity: 2 })],
    )
    expect(result.get('MGLU3')).toBe(10)
  })

  it('regra between aplicada corretamente em applyScoreRules', () => {
    const betweenRule = rule({
      metric: 'roe',
      operator: 'between',
      threshold_min: 5,
      threshold_max: 15,
      points: 15,
    })
    const result = applyScoreRules([betweenRule], [fund('BBAS3', { roe: 12 })])
    expect(result.get('BBAS3')).toBe(15)
  })
})
