import { expect, it } from 'vitest'
import { inflationComparison } from './inflationComparison'
import type { PerformanceSeries } from '../types'
const portfolio = (points: PerformanceSeries['points']): PerformanceSeries => ({ label: 'Carteira', color: 'blue', points })

it('compara meses completos na mesma base e inclui deflação sem criar pontos diários', () => {
  const series = inflationComparison(portfolio([
    { date: '2026-01-15', normalized: 100 }, { date: '2026-01-30', normalized: 110 },
    { date: '2026-02-27', normalized: 121 }, { date: '2026-03-31', normalized: 120 },
  ]), [{ date: '2026-02-01', value: 1 }, { date: '2026-03-01', value: -0.5 }], '2026-04-15')
  expect(series[0].points.map(p => p.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  expect(series[0].points[1].normalized).toBeCloseTo(110)
  expect(series[1].points[2].normalized).toBeCloseTo(100 * 1.01 * 0.995)
})

it('não preenche mês sem IPCA nem compara depois da lacuna', () => {
  const series = inflationComparison(portfolio([
    { date: '2026-01-31', normalized: 100 }, { date: '2026-02-28', normalized: 105 },
    { date: '2026-03-31', normalized: 110 }, { date: '2026-04-30', normalized: 120 },
  ]), [{ date: '2026-02-01', value: 1 }, { date: '2026-04-01', value: 2 }], '2026-05-15')
  expect(series[1].points.map(p => p.date)).toEqual(['2026-01-31', '2026-02-28'])
})

it('recusa atravessar lacunas da carteira ou usar o mês corrente', () => {
  const points = [{ date: '2026-01-31', normalized: 100 }, { date: '2026-02-15', normalized: null as unknown as number }, { date: '2026-02-28', normalized: 110 }]
  expect(inflationComparison(portfolio(points), [{ date: '2026-02-01', value: 1 }], '2026-03-15')[0].points).toEqual([])
  expect(inflationComparison(portfolio(points.filter(p => p.normalized !== null)), [{ date: '2026-02-01', value: 1 }], '2026-02-28')[0].points).toEqual([])
})
