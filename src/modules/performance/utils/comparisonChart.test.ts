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

it('mantém cada valor por série e por data, incluindo lacunas sem copiar vizinhos', () => {
  const chart = comparisonChart([
    { label: 'Carteira', color: 'blue', points: [{ date: '2026-10-19', normalized: 100 }, { date: '2026-10-20', normalized: 120 }, { date: '2026-10-21', normalized: null as unknown as number }, { date: '2026-10-22', normalized: 104 }] },
    { label: 'CDI', color: 'green', points: [{ date: '2026-10-19', normalized: 100 }, { date: '2026-10-20', normalized: 100.49 }] },
    { label: 'IBOV', color: 'yellow', points: [{ date: '2026-10-20', normalized: 99 }] },
    { label: 'IFIX', color: 'orange', points: [{ date: '2026-10-20', normalized: 102 }] },
  ])
  expect(chart.data[1]).toEqual({ date: Date.parse('2026-10-20T12:00:00Z'), series0: 120, series1: 100.49, series2: 99, series3: 102 })
  expect(chart.data[2]).toEqual({ date: Date.parse('2026-10-21T12:00:00Z'), series0: null, series1: null, series2: null, series3: null })
  expect(chart.data[3].series0).toBe(104)
})

it('não transforma uma série inteiramente ausente em gráfico disponível', () => {
  expect(comparisonChart([{ label: 'Carteira', color: 'blue', points: [{ date: '2026-10-20', normalized: null as unknown as number }] }]).data).toEqual([])
})
