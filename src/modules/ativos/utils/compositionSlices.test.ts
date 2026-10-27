import { expect, it } from 'vitest'
import type { PositionRow } from '../../portfolio/types'
import { buildAssetSlices } from './compositionSlices'

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
