import { expect, it } from 'vitest'
import { valueAssets } from './assetValuation'
import type { FixedIncomePosition, LatestQuote, PositionWithAsset } from '../portfolio/types'

const positions = [{ id: 'a', ticker: 'AAA3', quantity: 10, average_price: 8, asset: { currency: 'BRL', type: 'stock_br' } }] as PositionWithAsset[]
const quotes = [{ ticker: 'AAA3', close: 10 }] as LatestQuote[]
const fixed = [{ id: 'f', name: 'Tesouro', principal: 150, remaining_principal: 100, current_value: 120 }] as FixedIncomePosition[]

it('soma saldo e principal restante da renda fixa e recalcula os pesos sobre o total combinado', () => {
  const result = valueAssets(positions, quotes, fixed, null)
  expect(result.patrimonioBRL).toBe(220)
  expect(result.valorInvestidoBRL).toBe(180)
  expect(result.assetCount).toBe(2)
  expect(result.rows[0].weightPercent).toBeCloseTo(100 / 220 * 100)
  expect(result.compositionRows.reduce((sum, row) => sum + row.weightPercent!, 0)).toBeCloseTo(100)
})

it('carteira somente de renda fixa usa principal enquanto saldo não foi calculado', () => {
  const result = valueAssets([], [], [{ ...fixed[0], current_value: null }], null)
  expect(result.patrimonioBRL).toBe(100)
  expect(result.valorInvestidoBRL).toBe(100)
  expect(result.fixedRows[0].weightPercent).toBe(100)
})

it('não apresenta patrimônio parcial como total quando falta cotação ou câmbio', () => {
  expect(valueAssets(positions, [], fixed, null).patrimonioBRL).toBeNull()
  const usd = [{ ...positions[0], asset: { ...positions[0].asset!, currency: 'USD' as const } }]
  const result = valueAssets(usd, quotes, fixed, null)
  expect(result.patrimonioBRL).toBeNull()
  expect(result.valorInvestidoBRL).toBeNull()
  expect(result.rows[0].weightPercent).toBeNull()
  expect(valueAssets(usd, quotes, fixed, 5).patrimonioBRL).toBe(620)
})
