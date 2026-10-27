import { expect, it } from 'vitest'
import { calcGrahamMargin, calcGrahamPrice } from './grahamCalculation'

it('calcula o número de Graham com lucro e patrimônio por ação positivos', () => {
  expect(calcGrahamPrice(2, 20)).toBe(30)
  expect(calcGrahamPrice(4, 40)).toBe(60)
})

it('rejeita prejuízo e patrimônio negativo mesmo quando o produto seria positivo', () => {
  expect(calcGrahamPrice(-2, -20)).toBeNull()
  expect(calcGrahamPrice(0, 20)).toBeNull()
  expect(calcGrahamPrice(2, null)).toBeNull()
  expect(calcGrahamPrice(Infinity, 20)).toBeNull()
})

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
