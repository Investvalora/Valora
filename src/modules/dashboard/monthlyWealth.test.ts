import { expect, it } from 'vitest'
import { buildMonthlyWealth } from './monthlyWealth'
import type { PositionWithAsset } from '../portfolio/types'
import type { HistoricalTransaction } from './monthlyWealth'

const trade = (overrides: Partial<HistoricalTransaction> = {}): HistoricalTransaction => ({ ticker: 'BR', wallet_id: 'w', transaction_date: '2026-08-01', seq: 1, type: 'buy', quantity: 10, price: 10, currency: 'BRL', ...overrides })

it('não cria meses anteriores à primeira compra por cotações ou data legada da posição', () => {
  const position = { wallet_id: 'w', ticker: 'BR', quantity: 10, average_price: 10, acquisition_date: '2024-01-01', asset: { currency: 'BRL' } } as PositionWithAsset
  const result = buildMonthlyWealth([position], [
    { ticker: 'BR', date: '2025-01-31', close: 5 },
    { ticker: 'BR', date: '2026-09-30', close: 12 },
  ], [], null, '2026-10-26', [trade({ transaction_date: '2026-09-15' })])
  expect(result.map((point) => point.month)).toEqual(['2026-09', '2026-10'])
})

it('não inicia com venda órfã ou compra futura e preserva aplicação antiga válida', () => {
  const prices = [{ ticker: 'BR', date: '2025-01-31', close: 10 }]
  expect(buildMonthlyWealth([], prices, [], null, '2026-10-26', [trade({ type: 'sell' })])).toEqual([])
  expect(buildMonthlyWealth([], prices, [], null, '2026-10-26', [trade({ transaction_date: '2027-01-01' })])).toEqual([])
  const fixed = buildMonthlyWealth([], prices, [{ principal: 100, application_date: '2025-09-01' }], null, '2025-10-26')
  expect(fixed.map((point) => point.month)).toEqual(['2025-09', '2025-10'])
})

it('reconstrói aportes, venda parcial e encerramento sem aplicar a quantidade atual ao passado', () => {
  const result = buildMonthlyWealth([], [
    { ticker: 'BR', date: '2026-08-31', close: 12 },
    { ticker: 'BR', date: '2026-09-30', close: 18 },
  ], [], null, '2026-10-25', [
    trade(), trade({ transaction_date: '2026-09-01', seq: 2, quantity: 10, price: 20 }),
    trade({ transaction_date: '2026-09-02', seq: 3, type: 'sell', quantity: 5, price: 30 }),
    trade({ transaction_date: '2026-10-01', seq: 4, type: 'sell', quantity: 15, price: 40 }),
  ])
  expect(result).toEqual([
    { month: '2026-08', totalBRL: 120, investedBRL: 100 },
    { month: '2026-09', totalBRL: 270, investedBRL: 225 },
    { month: '2026-10', totalBRL: 0, investedBRL: 0 },
  ])
})

it('mantém custo por carteira, respeita o corte exato e ignora proventos na quantidade', () => {
  const result = buildMonthlyWealth([], [{ ticker: 'BR', date: '2026-09-10', close: 12 }, { ticker: 'BR', date: '2026-09-30', close: 100 }], [], null, '2026-09-15', [
    trade(), trade({ wallet_id: 'other', price: 20 }),
    trade({ type: 'sell', quantity: 10, transaction_date: '2026-09-01', seq: 2 }),
    trade({ type: 'dividend', quantity: 999, seq: 3 }),
    trade({ type: 'buy', quantity: 999, transaction_date: '2026-09-20', seq: 4 }),
  ])
  expect(result[result.length - 1]).toEqual({ month: '2026-09', totalBRL: 120, investedBRL: 200 })
})

it('não assume moeda BRL para ativo vendido sem metadados', () => {
  expect(buildMonthlyWealth([], [{ ticker: 'BR', date: '2026-08-31', close: 12 }], [], 5, '2026-08-31', [trade({ currency: null })])).toEqual([])
})

const positions = [
  { ticker: 'BR', quantity: 10, average_price: 10, acquisition_date: '2026-09-01', asset: { currency: 'BRL' } },
  { ticker: 'USD', quantity: 2, average_price: 10, acquisition_date: '2026-09-01', asset: { currency: 'USD', type: 'crypto' } },
  { ticker: 'NEW', quantity: 1, average_price: 100, acquisition_date: '2026-10-01', asset: { currency: 'BRL' } },
] as PositionWithAsset[]

it('separa aplicado e ganho de setembro com fechamentos em dias diferentes e sem compras futuras', () => {
  const result = buildMonthlyWealth(positions, [
    { ticker: 'USD', date: '2026-09-29', close: 15 },
    { ticker: 'BR', date: '2026-09-30', close: 12 },
    { ticker: 'BR', date: '2026-10-01', close: 1000 },
    { ticker: 'NEW', date: '2026-10-01', close: 110 },
  ], [], 5)
  expect(result[0]).toEqual({ month: '2026-09', investedBRL: 200, totalBRL: 270 })
  expect(result[0].totalBRL! - result[0].investedBRL!).toBe(70)
  expect(result[1]).toEqual({ month: '2026-10', investedBRL: 300, totalBRL: 10260 })
})

it('não inventa patrimônio completo ou ganho se um ativo não tem fechamento histórico', () => {
  expect(buildMonthlyWealth(positions, [{ ticker: 'BR', date: '2026-09-30', close: 12 }], [], 5)).toEqual([])
})

it('renda fixa entra pelo principal somente a partir da aplicação, sem retroagir o rendimento atual', () => {
  const result = buildMonthlyWealth(positions.slice(0, 1), [
    { ticker: 'BR', date: '2026-09-30', close: 12 },
    { ticker: 'BR', date: '2026-10-01', close: 13 },
  ], [{ principal: 1000, application_date: '2026-10-01' }], null)
  expect(result[0]).toEqual({ month: '2026-09', investedBRL: 100, totalBRL: 120 })
  expect(result[1]).toEqual({ month: '2026-10', investedBRL: 1100, totalBRL: 1130 })
})

it('gera meses de renda fixa mesmo sem cotações de renda variável', () => {
  const result = buildMonthlyWealth([], [], [{ principal: 1000, application_date: '2026-09-15' }], null, '2026-10-24')
  expect(result).toEqual([
    { month: '2026-09', totalBRL: 1000, investedBRL: 1000 },
    { month: '2026-10', totalBRL: 1000, investedBRL: 1000 },
  ])
})
