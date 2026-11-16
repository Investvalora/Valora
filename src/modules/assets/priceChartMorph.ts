import { blendValue, sampleCurve } from '../../shared/utils/chartMorph'
import type { PricePoint } from './types'

export function canMorphPrices(from: PricePoint[], to: PricePoint[]) {
  return from.length > 1 && to.length > 1
}

export function morphPrices(from: PricePoint[], to: PricePoint[], progress: number): PricePoint[] {
  return to.map((point, index) => ({
    ...point,
    close: blendValue(
      sampleCurve(from, index / Math.max(1, to.length - 1), (item) => item.close),
      point.close,
      progress,
    ),
  }))
}
