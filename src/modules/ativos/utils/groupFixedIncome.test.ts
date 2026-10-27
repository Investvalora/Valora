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
