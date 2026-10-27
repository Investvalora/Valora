import type { DailyReturn } from './historicalReturns'
import type { PerformanceSeries } from '../types'

/** Cada trecho contínuo tem sua própria base; lacunas nunca viram retorno zero. */
export function returnChartSeries(points: DailyReturn[], since: string): PerformanceSeries {
  let factor = 100
  let covered = false
  const chart: PerformanceSeries['points'] = []
  for (const point of points.filter((point) => point.date >= since)) {
    if (point.returnPct === null || !Number.isFinite(point.returnPct)) {
      chart.push({ date: point.date, normalized: null as unknown as number })
      factor = 100
      covered = false
    } else {
      // Primeiro fechamento válido de cada trecho estabelece a base.
      factor = covered ? factor * (1 + point.returnPct) : 100
      covered = true
      chart.push({ date: point.date, normalized: factor })
    }
  }
  return { label: 'Carteira', color: '#3b82f6', points: chart }
}
