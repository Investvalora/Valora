import { expect, it } from 'vitest'
import { interpolateComposition, type CompositionFrame } from './compositionMotion'

const from: CompositionFrame = { totalBRL: 1000, slices: [{ id: 'class', label: 'Classe', percent: 100, valueBRL: 1000, color: '#ff0000', international: false, topTicker: null }] }
const to: CompositionFrame = { totalBRL: 1000, slices: [
  { ...from.slices[0], id: 'asset-a', percent: 30, valueBRL: 300, color: '#0000ff' },
  { ...from.slices[0], id: 'asset-b', percent: 70, valueBRL: 700, color: '#00ff00' },
] }

it('divide os segmentos preservando o total e termina com os dados exatos', () => {
  const middle = interpolateComposition(from, to, 0.5)
  expect(middle.slices.map(slice => slice.percent)).toEqual([65, 35])
  expect(middle.slices.map(slice => slice.color)).toEqual(['#800080', '#00ff00'])
  expect(middle.slices.reduce((sum, slice) => sum + slice.valueBRL, 0)).toBe(1000)
  expect(interpolateComposition(from, to, 1)).toBe(to)
})

it('recolhe segmentos extras sem esvaziar a rosca inteira', () => {
  const middle = interpolateComposition(to, from, 0.5)
  expect(middle.slices.map(slice => slice.percent)).toEqual([65, 35])
  expect(middle.slices[1].opacity).toBe(0.5)
  expect(interpolateComposition(to, from, 1).slices).toHaveLength(1)
})
