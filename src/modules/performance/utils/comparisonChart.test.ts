import { expect, it } from 'vitest'
import { comparisonChart } from './comparisonChart'

it('corta a janela nas datas válidas da carteira e ajusta a escala às variações', () => {
  const result = comparisonChart([
    { label: 'Carteira', color: 'blue', points: [{ date: '2026-01-01', normalized: 100 }, { date: '2026-01-02', normalized: 90 }, { date: '2026-12-01', normalized: null as unknown as number }] },
    { label: 'CDI', color: 'green', points: [{ date: '2026-01-01', normalized: 100 }, { date: '2026-01-02', normalized: 101 }, { date: '2026-12-01', normalized: 120 }] },
  ])
  expect(result.dates).toEqual(['2026-01-01', '2026-01-02'])
  expect(result.series[1].points).toHaveLength(2)
  expect(result.domain[0]).toBeGreaterThan(80)
  expect(result.domain[1]).toBeLessThan(110)
})
