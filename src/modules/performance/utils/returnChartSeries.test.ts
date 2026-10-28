import { expect, it } from 'vitest'
import { returnChartSeries, alignedBenchmarkSeries } from './returnChartSeries'

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

it('inclui o primeiro retorno e usa o fechamento anterior como base', () => {
  const result = returnChartSeries([{ date: '2026-01-02', value: 110, returnPct: 0.1 }, { date: '2026-01-03', value: 121, returnPct: 0.1 }], '2026-01-02')
  expect(result.points[0]).toEqual({ date: '2026-01-01', normalized: 100 })
  expect(result.points[result.points.length - 1]?.normalized).toBeCloseTo(121)
})

it('compara nas mesmas datas, usa preço anterior em feriado e não inventa cobertura na base', () => {
  const portfolio = returnChartSeries([{ date: '2026-01-03', value: 110, returnPct: 0.1 }, { date: '2026-01-04', value: 121, returnPct: 0.1 }], '2026-01-03')
  const aligned = alignedBenchmarkSeries(portfolio, [{ date: '2026-01-02', value: 200 }, { date: '2026-01-04', value: 220 }], 'CDI', 'green')
  expect(aligned.points.map(p => p.date)).toEqual(portfolio.points.map(p => p.date))
  expect(aligned.points.map(p => p.normalized)).toEqual([100, 100, 110.00000000000001])
  expect(alignedBenchmarkSeries(portfolio, [{ date: '2026-01-04', value: 220 }], 'CDI', 'green').points.every(p => p.normalized === null)).toBe(true)
})

it('recomeça índices na mesma base local após lacuna da carteira', () => {
  const portfolio = returnChartSeries([
    { date: '2026-01-02', value: null, returnPct: null },
    { date: '2026-01-03', value: 100, returnPct: 0 },
    { date: '2026-01-04', value: 110, returnPct: 0.1 },
    { date: '2026-01-05', value: null, returnPct: null },
    { date: '2026-01-06', value: 120, returnPct: 0 },
  ], '2026-01-02')
  const aligned = alignedBenchmarkSeries(portfolio, [{ date: '2026-01-01', value: 200 }, { date: '2026-01-04', value: 220 }, { date: '2026-01-06', value: 250 }], 'IBOV', 'yellow')
  expect(aligned.points.map(p => p.normalized)).toEqual([null, 100, 110.00000000000001, null, 100])
})
it('respeita período e não inventa série sem cobertura', () => {
  expect(returnChartSeries([{ date: '2026-01-01', value: 100, returnPct: 0 }], '2026-02-01').points).toEqual([])
  expect(returnChartSeries([{ date: '2026-01-01', value: null, returnPct: null }], '2026-01-01').points[0].normalized).toBeNull()
})
