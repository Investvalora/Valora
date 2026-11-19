import { describe, expect, it } from 'vitest'
import { invalidFraction, invalidCsvFraction } from './wholeUnits'
describe('quantidades por mercado', () => {
  it('exige unidades inteiras nas quatro classes brasileiras', () => {
    for (const type of ['stock_br','fii','bdr','etf_br'] as const) {
      expect(invalidFraction(type, 0.5)).toBe(true)
      expect(invalidFraction(type, 1)).toBe(false)
      expect(invalidFraction(type, 99)).toBe(false)
      expect(invalidCsvFraction(type, '9.999.999.999,00000001')).toBe(true)
      expect(invalidCsvFraction(type, '1.000,00000000')).toBe(false)
    }
  })
  it('preserva frações americanas, cripto e Tesouro', () => {
    for (const type of ['stock_us','etf_us','reit','crypto','fixed_income'] as const) expect(invalidFraction(type, 0.03)).toBe(false)
  })
})
