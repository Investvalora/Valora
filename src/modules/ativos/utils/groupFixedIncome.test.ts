import { expect, it } from 'vitest'
import { valueAssets } from '../assetValuation'
import { groupFixedIncome } from './groupFixedIncome'
import type { FixedIncomePosition } from '../../portfolio/types'

const lot = { name: 'RDB Nubank 115% CDI', type: 'rdb_cdi', indexer: 'cdi', rate: 115, principal: 100, current_value: 110 } as FixedIncomePosition
it('agrupa aplicações do mesmo produto, preserva lotes e pondera a rentabilidade pelo principal', () => {
  const rows = valueAssets([], [], [{ ...lot, id: '1' }, { ...lot, id: '2', principal: 300, current_value: 315 }], null).fixedRows
  const groups = groupFixedIncome(rows)
  expect(groups).toHaveLength(1)
  expect(groups[0]).toMatchObject({ principal: 400, balance: 425, gain: 25, returnPercent: 6.25 })
  expect(groups[0].weight).toBeCloseTo(100)
  expect(groups[0].lots.map((row) => row.id)).toEqual(['1', '2'])
})
it('separa nomes, produtos, indexadores e taxas diferentes', () => {
  const rows = valueAssets([], [], [lot, { ...lot, rate: 110 }, { ...lot, name: 'Outro banco' }, { ...lot, type: 'cdb_cdi' }, { ...lot, indexer: 'ipca' }], null).fixedRows
  expect(groupFixedIncome(rows)).toHaveLength(5)
})
it('não apresenta saldo parcial como total do grupo', () => {
  const rows = valueAssets([], [], [lot, { ...lot, id: '2' }], null).fixedRows
  rows[1].marketValueBRL = null
  rows[1].weightPercent = null
  expect(groupFixedIncome(rows)[0]).toMatchObject({ balance: null, gain: null, returnPercent: null, weight: null })
})

it('consolida o mesmo Tesouro com taxas e datas de compra distintas sem perder os lotes', () => {
  const treasury = { ...lot, name: 'Tesouro IPCA+ 2029 (taxa ref. aprox.)', type: 'tesouro_ipca', indexer: 'ipca', maturity_date: '2029-05-15' } as FixedIncomePosition
  const rows = valueAssets([], [], [
    { ...treasury, id: 'may', rate: 7.19, application_date: '2025-05-20', treasury_quantity: 0.03, principal: 102.0009, current_value: 118.7583 },
    { ...treasury, id: 'sep', rate: 7.83, application_date: '2025-09-23', treasury_quantity: 0.01, principal: 34.7147, current_value: 39.5861 },
  ], null).fixedRows
  const groups = groupFixedIncome(rows)
  expect(groups).toHaveLength(1)
  expect(groups[0].principal).toBeCloseTo(136.7156)
  expect(groups[0].balance).toBeCloseTo(158.3444)
  expect(groups[0].gain).toBeCloseTo(21.6288)
  expect(groups[0].returnPercent).toBeCloseTo((158.3444 / 136.7156 - 1) * 100)
  expect(groups[0].lots.map(row => [row.id, row.fixedIncome?.rate, row.acquisitionDate])).toEqual([
    ['may', 7.19, '2025-05-20'], ['sep', 7.83, '2025-09-23'],
  ])
})

it('não mistura Tesouros de vencimentos ou modalidades diferentes', () => {
  const treasury = { ...lot, name: 'Tesouro IPCA+ 2029', type: 'tesouro_ipca', indexer: 'ipca', maturity_date: '2029-05-15' } as FixedIncomePosition
  const rows = valueAssets([], [], [treasury,
    { ...treasury, maturity_date: '2035-05-15' },
    { ...treasury, name: 'Tesouro IPCA+ com juros semestrais 2029' },
    { ...treasury, type: 'tesouro_pre', indexer: 'pre' },
  ], null).fixedRows
  expect(groupFixedIncome(rows)).toHaveLength(4)
})
