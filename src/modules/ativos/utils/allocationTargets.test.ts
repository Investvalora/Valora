import { describe, expect, it } from 'vitest'
import { validTargets, allocationGap } from './allocationTargets'

describe('metas por classe', () => {
  it('aceita ausência de metas e percentuais que somam 100', () => {
    expect(validTargets({})).toBe(true)
    expect(validTargets({ stock_br: 33.33, fii: 33.33, fixed_income: 33.34 })).toBe(true)
  })
  it('rejeita soma incompleta, negativos, valores não finitos e precisão excessiva', () => {
    expect(validTargets({ stock_br: 99 })).toBe(false)
    expect(validTargets({ stock_br: 101, fii: -1 })).toBe(false)
    expect(validTargets({ stock_br: NaN })).toBe(false)
    expect(validTargets({ stock_br: 33.333, fii: 66.667 })).toBe(false)
  })
  it('calcula falta, excesso e meta zero sem confundir aporte com diferença', () => {
    expect(allocationGap(1000, 200, 30)).toBe(100)
    expect(allocationGap(1000, 400, 30)).toBe(-100)
    expect(allocationGap(1000, 50, 0)).toBe(-50)
  })
})
