import { expect, it } from 'vitest'
import { returnChartSeries } from './returnChartSeries'

it('preserva trechos disponíveis sem acumular retornos através de uma lacuna', () => {
  const result = returnChartSeries([
    { date: '2026-01-01', value: null, returnPct: null },
    { date: '2026-01-02', value: 100, returnPct: 0 },
    { date: '2026-01-03', value: 110, returnPct: 0.1 },
    { date: '2026-01-04', value: null, returnPct: null },
    { date: '2026-01-05', value: 150, returnPct: 0.2 },
    { date: '2026-01-06', value: 135, returnPct: -0.1 },
  ], '2026-01-01')
  expect(result.points.map((point) => point.normalized)).toEqual([null, 100, 110.00000000000001, null, 100, 90])
})
it('respeita período e não inventa série sem cobertura', () => {
  expect(returnChartSeries([{ date: '2026-01-01', value: 100, returnPct: 0 }], '2026-02-01').points).toEqual([])
  expect(returnChartSeries([{ date: '2026-01-01', value: null, returnPct: null }], '2026-01-01').points[0].normalized).toBeNull()
})
