import { expect, it } from 'vitest'
import { calcGrahamMargin } from './grahamCalculation'

it('expressa desconto e sobrepreço sobre o preço justo', () => {
  expect(calcGrahamMargin(100, 40)).toBe(60)
  expect(calcGrahamMargin(100, 150)).toBe(-50)
  expect(calcGrahamMargin(100, 100)).toBe(0)
})
it('não apresenta percentual para referências inválidas', () => {
  expect(calcGrahamMargin(0, 40)).toBeNull()
  expect(calcGrahamMargin(-100, 40)).toBeNull()
  expect(calcGrahamMargin(100, 0)).toBeNull()
  expect(calcGrahamMargin(null, 40)).toBeNull()
})
