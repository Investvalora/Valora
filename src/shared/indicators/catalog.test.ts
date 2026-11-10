import { expect, it } from 'vitest'
import { INDICATOR_CATALOG, INDICATOR_IDS, indicatorValue, supportsIndicator } from './catalog'
it('não converte percentuais nem usa dívida de fonte sem convenção validada', () => {
  expect(indicatorValue({ debt_equity: 76, source: 'yahoo' }, 'debt_equity')).toBe(76)
  expect(indicatorValue({ debt_equity: 76, source: 'brapi' }, 'debt_equity')).toBeNull()
  expect(indicatorValue({ debt_equity: 76 }, 'debt_equity')).toBeNull()
  expect(indicatorValue({ dy: 7, source: 'seed' }, 'dy')).toBeNull()
  expect(indicatorValue({ roe: 7, source: 'yahoo' }, 'roe', 'fii')).toBeNull()
})
it('mantém unidades explícitas sem converter limites já salvos', () => {
  expect(INDICATOR_CATALOG.debt_equity.unit).toBe('percent')
  expect(INDICATOR_CATALOG.debt_equity.requiredSource).toBe('yahoo')
  expect(INDICATOR_CATALOG.pl.unit).toBe('multiple')
  expect(INDICATOR_IDS).toHaveLength(6)
})
it('separa indicadores de empresas e fundos, excluindo criptos e renda fixa', () => {
  expect(supportsIndicator('pvp', 'fii')).toBe(true)
  expect(supportsIndicator('roe', 'fii')).toBe(false)
  expect(supportsIndicator('roe', 'stock_us')).toBe(true)
  for (const id of INDICATOR_IDS) {
    expect(supportsIndicator(id, 'crypto')).toBe(false)
    expect(supportsIndicator(id, 'fixed_income')).toBe(false)
  }
})
