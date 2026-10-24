import { expect, it } from 'vitest'
import { buildMonthlyWealth } from './monthlyWealth'
import type { PositionWithAsset } from '../portfolio/types'

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
