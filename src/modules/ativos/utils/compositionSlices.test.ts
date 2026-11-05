import { expect, it } from 'vitest'
import type { PositionRow } from '../../portfolio/types'
import { buildAssetSlices, buildSectorSlices } from './compositionSlices'

it('agrega o ticker, ordena por valor e preserva percentuais e cores após reordenar', () => {
  const rows = [
    { ticker: 'AAA', name: 'A', currency: 'BRL', marketValueBRL: 30 },
    { ticker: 'BBB', name: 'B', currency: 'USD', marketValueBRL: 60 },
    { ticker: 'AAA', name: 'A', currency: 'BRL', marketValueBRL: 10 },
    { ticker: 'SEM', marketValueBRL: null },
  ] as PositionRow[]
  const slices = buildAssetSlices(rows, 100)
  expect(slices.map(({ id, valueBRL, percent }) => ({ id, valueBRL, percent }))).toEqual([
    { id: 'BBB', valueBRL: 60, percent: 60 }, { id: 'AAA', valueBRL: 40, percent: 40 },
  ])
  expect(slices[0].international).toBe(true)
  expect(buildAssetSlices([...rows].reverse(), 100)).toEqual(slices)
  expect(buildAssetSlices(rows, 0)).toEqual([])
})


it('setores preservam 100% incluindo dados ausentes e classes sem setor econômico', () => {
  const rows = [
    { ticker: 'BBAS3', type: 'stock_br', marketValueBRL: 40 },
    { ticker: 'WEGE3', type: 'stock_br', marketValueBRL: 20 },
    { ticker: 'MXRF11', type: 'fii', marketValueBRL: 10 },
    { ticker: 'AAPL', type: 'stock_us', marketValueBRL: 10 },
    { ticker: 'RDB', type: 'fixed_income', marketValueBRL: 20 },
  ] as PositionRow[]
  const sectors = [{ ticker: 'BBAS3', sector: 'Financeiro', source: 'brapi' as const }, { ticker: 'MXRF11', sector: 'Financeiro', source: 'brapi' as const }]
  const result = buildSectorSlices(rows, 100, sectors)
  expect(result.reduce((sum, row) => sum + row.percent, 0)).toBeCloseTo(100)
  expect(result.find(row => row.label === 'Financeiro')!.valueBRL).toBe(40)
  expect(result.find(row => row.label === 'Não classificado')!.valueBRL).toBe(40)
  expect(result.find(row => row.label === 'Sem setor econômico')!.valueBRL).toBe(20)
  expect(buildSectorSlices([...rows].reverse(), 100, sectors)).toEqual(result)
})
