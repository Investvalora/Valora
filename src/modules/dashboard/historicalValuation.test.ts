import { expect, it } from 'vitest'
import { fixedIncomeAt, rateAt } from './historicalValuation'
import { buildMonthlyWealth } from './monthlyWealth'
import type { PositionWithAsset } from '../portfolio/types'
import type { FixedIncomeEvent } from '../portfolio/types'
import { fixedIncomePrincipalAt } from './historicalValuation'

it('preserva meses anteriores ao resgate e capitaliza o saldo pós-cupom sem duplicar recebimentos', () => {
  const events = [
    { event_date: '2026-08-31', seq: 1, type: 'coupon', amount: 20, principal_redeemed: 0, balance_after: 1010 },
    { event_date: '2026-09-15', seq: 2, type: 'redemption', amount: 620, principal_redeemed: 600, balance_after: 420 },
    { event_date: '2026-10-01', seq: 3, type: 'redemption', amount: 420, principal_redeemed: 400, balance_after: 0 },
  ] as FixedIncomeEvent[]
  const position = { principal: 1000, application_date: '2026-08-01', indexer: 'pre' as const, rate: 0, active: false, events }
  expect(fixedIncomeAt(position, '2026-08-30', [])).toBe(1000)
  expect(fixedIncomeAt(position, '2026-08-31', [])).toBe(1010)
  expect(fixedIncomeAt(position, '2026-09-30', [])).toBe(420)
  expect(fixedIncomePrincipalAt(position, '2026-09-30')).toBe(400)
  expect(fixedIncomeAt(position, '2026-10-01', [])).toBe(0)
  expect(fixedIncomePrincipalAt(position, '2026-10-01')).toBe(0)
  const result = buildMonthlyWealth([], [], [position], null, '2026-10-25', [], { usd: [], macro: [] })
  expect(result).toEqual([
    { month: '2026-08', totalBRL: 1010, investedBRL: 1000 },
    { month: '2026-09', totalBRL: 420, investedBRL: 400 },
    { month: '2026-10', totalBRL: 0, investedBRL: 0 },
  ])
})

it('usa PTAX do fechamento de cada mês, sem fallback atual nem taxa futura', () => {
  const positions = [{ ticker: 'US', quantity: 2, average_price: 10, acquisition_date: '2026-08-01', asset: { currency: 'USD' } }] as PositionWithAsset[]
  const prices = [{ ticker: 'US', date: '2026-08-31', close: 12 }, { ticker: 'US', date: '2026-09-30', close: 15 }]
  const result = buildMonthlyWealth(positions, prices, [], 999, '2026-09-30', [], { usd: [{ date: '2026-08-31', value: 5 }, { date: '2026-09-30', value: 6 }, { date: '2026-10-01', value: 1000 }], macro: [] })
  expect(result).toEqual([{ month: '2026-08', totalBRL: 120, investedBRL: 100 }, { month: '2026-09', totalBRL: 180, investedBRL: 120 }])
  expect(buildMonthlyWealth(positions, prices, [], 999, '2026-09-30', [], { usd: [], macro: [] })).toEqual([])
  expect(rateAt([{ date: '2026-09-25', value: 5 }], '2026-09-27')).toBe(5)
  expect(rateAt([{ date: '2026-09-01', value: 5 }], '2026-09-27')).toBeNull()
})

it('reconstitui prefixado até o vencimento e mantém o principal separado do ganho', () => {
  const position = { principal: 1000, application_date: '2025-01-01', maturity_date: '2026-01-01', indexer: 'pre' as const, rate: 10 }
  expect(fixedIncomeAt(position, '2026-09-30', [])).toBeCloseTo(1100)
  const result = buildMonthlyWealth([], [], [position], null, '2026-01-31', [], { usd: [], macro: [] })
  expect(result[result.length - 1].totalBRL).toBeCloseTo(1100)
  expect(result[result.length - 1].investedBRL).toBe(1000)
})

it('CDI aplica percentual sobre a taxa diária e não usa índices posteriores ao corte', () => {
  const position = { principal: 1000, application_date: '2026-09-01', indexer: 'cdi' as const, rate: 120 }
  const macro = [{ series: 'cdi', date: '2026-09-01', value: 10 }, { series: 'cdi', date: '2026-09-02', value: 10 }, { series: 'cdi', date: '2026-10-01', value: 1000 }]
  expect(fixedIncomeAt(position, '2026-09-03', macro)).toBeCloseTo(1000 * (1 + ((1.1 ** (1 / 252)) - 1) * 1.2) ** 2)
  expect(fixedIncomeAt(position, '2026-09-30', macro)).toBeNull()
})

it('IPCA considera apenas meses completos e aceita deflação; falta de mês não vira zero', () => {
  const position = { principal: 1000, application_date: '2026-08-01', indexer: 'ipca' as const, rate: 0 }
  const macro = [{ series: 'ipca', date: '2026-08-01', value: -0.5 }, { series: 'ipca', date: '2026-09-01', value: 1 }]
  expect(fixedIncomeAt(position, '2026-08-15', macro)).toBe(1000)
  expect(fixedIncomeAt(position, '2026-08-31', macro)).toBe(995)
  expect(fixedIncomeAt(position, '2026-09-30', macro)).toBeCloseTo(1004.95)
  expect(fixedIncomeAt(position, '2026-09-30', macro.slice(1))).toBeNull()
})

it('Selic preserva taxa anual cadastrada sem somar outro índice ou rendimento futuro', () => {
  expect(fixedIncomeAt({ principal: 1000, application_date: '2025-01-01', indexer: 'selic', rate: 10 }, '2026-01-01', [{ series: 'selic', date: '2025-01-01', value: 10 }])).toBeCloseTo(1100)
})
