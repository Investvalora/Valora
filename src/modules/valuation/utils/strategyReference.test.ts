import { expect, it } from 'vitest'
import { strategyReference } from './strategyReference'
import type { ValuationStrategy } from '../hooks/useStrategies'
import type { PositionRow } from '../../portfolio/types'

const strategy: ValuationStrategy = { id: 's', name: 'Renda 8%', method: 'bazin', min_dy: 0.08, safety_discount: 0.2, show_in_assets: true }
const row = { type: 'stock_us', currency: 'USD', bazinCeiling: 40, grahamPrice: 30 } as PositionRow

it('recalcula Bazin com DY personalizado e aplica desconto sem converter a moeda outra vez', () => {
  // Proventos de 2,40 / 8% = 30; desconto de 20% = 24 USD.
  expect(strategyReference(strategy, row)).toBeCloseTo(24)
  expect(strategyReference({ ...strategy, min_dy: 0.12, safety_discount: 0 }, row)).toBeCloseTo(20)
})
it('aplica o desconto de Graham sem depender do DY', () => {
  expect(strategyReference({ ...strategy, method: 'graham', min_dy: 0.01 }, row)).toBeCloseTo(24)
})

it('não aplica a estratégia fora das classes escolhidas', () => {
  expect(strategyReference({ ...strategy, asset_types: ['stock_br'] }, row)).toBeNull()
  expect(strategyReference({ ...strategy, asset_types: ['stock_us'] }, row)).toBeCloseTo(24)
})

it('calcula teto de FIIs por fundo e restringe a referência à classe correta', () => {
  const fii: ValuationStrategy = { ...strategy, method: 'fii', safety_discount: 0, fii_inflation: 0.0439, fii_treasury: 0.083, fii_tax: 0.15, fii_premium: 0.01 }
  const first = strategyReference(fii, { ...row, type: 'fii', currency: 'BRL', bazinCeiling: 20 })!
  const second = strategyReference(fii, { ...row, type: 'fii', currency: 'BRL', bazinCeiling: 40 })!
  expect(first).toBeCloseTo(9.830282913875212)
  expect(second).toBeCloseTo(first * 2)
  expect(strategyReference(fii, row)).toBeNull()
  expect(strategyReference(fii, { ...row, type: 'fii', bazinCeiling: null })).toBeNull()
  expect(strategyReference({ ...fii, fii_tax: null }, { ...row, type: 'fii' })).toBeNull()
})
it('não inventa referência para dados ausentes e classes inadequadas', () => {
  expect(strategyReference(strategy, { ...row, bazinCeiling: null })).toBeNull()
  expect(strategyReference(strategy, { ...row, type: 'crypto' })).toBeNull()
  expect(strategyReference({ ...strategy, method: 'graham' }, { ...row, type: 'fii' })).toBeNull()
  expect(strategyReference({ ...strategy, min_dy: 0 }, row)).toBeNull()
  expect(strategyReference({ ...strategy, safety_discount: 1 }, row)).toBeNull()
})
