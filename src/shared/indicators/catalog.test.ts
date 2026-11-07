import { expect, it } from 'vitest'
import { INDICATOR_CATALOG, INDICATOR_IDS, supportsIndicator } from './catalog'
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
