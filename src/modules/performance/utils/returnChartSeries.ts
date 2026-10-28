import type { DailyReturn } from './historicalReturns'
import type { PerformanceSeries } from '../types'

/** Cada trecho contínuo tem sua própria base; lacunas nunca viram retorno zero. */
export function returnChartSeries(points: DailyReturn[], since: string): PerformanceSeries {
  let factor = 100
  let covered = false
  const chart: PerformanceSeries['points'] = []
  const selected = points.filter((point) => point.date >= since)
  // O primeiro retorno também faz parte do acumulado. A base representa o
  // fechamento anterior, em vez de descartar o rendimento do primeiro dia.
  if (selected[0]?.returnPct !== null && Number.isFinite(selected[0]?.returnPct)) {
    chart.push({ date: new Date(Date.parse(`${selected[0].date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10), normalized: 100 })
    covered = true
  }
  for (const point of selected) {
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

/** Índices no mesmo calendário e base dos trechos da carteira. Nunca usa
 * observações futuras nem transporta cotações por mais de dez dias. */
export function alignedBenchmarkSeries(
  portfolio: PerformanceSeries, rows: Array<{ date: string; value: number }>, label: string, color: string,
): PerformanceSeries {
  const ordered = [...rows].filter(r => Number.isFinite(Number(r.value)) && Number(r.value) > 0).sort((a, b) => a.date.localeCompare(b.date))
  let cursor = 0, latest: (typeof ordered)[number] | undefined
  let base: number | null = null, started = false
  return { label, color, points: portfolio.points.map(point => {
    while (cursor < ordered.length && ordered[cursor].date <= point.date) latest = ordered[cursor++]
    const value = latest && (Date.parse(point.date) - Date.parse(latest.date)) / 86400000 <= 10 ? Number(latest.value) : null
    if (point.normalized === null) { base = null; started = false; return { date: point.date, normalized: null as unknown as number } }
    if (!started) { base = value; started = true }
    return { date: point.date, normalized: base !== null && value !== null ? value / base * 100 : null as unknown as number }
  }) }
}
