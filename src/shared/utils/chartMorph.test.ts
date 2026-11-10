import { expect, it } from 'vitest'
import { blendValue, sampleCurve } from './chartMorph'

it('reamostra a curva anterior e passa por valores intermediários', () => {
  const previous = [{ close: 10 }, { close: 30 }]
  const oldMiddle = sampleCurve(previous, 0.5, (point) => point.close)

  expect(oldMiddle).toBe(20)
  expect(blendValue(oldMiddle, 40, 0)).toBe(20)
  expect(blendValue(oldMiddle, 40, 0.5)).toBe(30)
  expect(blendValue(oldMiddle, 40, 1)).toBe(40)
})
