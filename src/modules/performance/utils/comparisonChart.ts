import type { PerformanceSeries } from '../types'

export function comparisonChart(series: PerformanceSeries[]) {
  const valid = (value: number) => value !== null && Number.isFinite(value)
  const portfolioDates = series.find((item) => item.label === 'Carteira')?.points.filter((point) => valid(point.normalized)).map((point) => point.date).sort() ?? []
  const from = portfolioDates[0]
  const until = portfolioDates[portfolioDates.length - 1]
  const visible = series.map((item) => ({ ...item, points: item.points.filter((point) => (!from || point.date >= from) && (!until || point.date <= until)) }))
  const dates = [...new Set(visible.flatMap((item) => item.points.filter((point) => valid(point.normalized)).map((point) => point.date)))].sort()
  const values = visible.flatMap((item) => item.points.map((point) => point.normalized).filter(valid))
  const low = Math.min(100, ...values), high = Math.max(100, ...values)
  const padding = Math.max(1, (high - low) * 0.15)
  return { series: visible, dates, domain: [Math.floor(low - padding), Math.ceil(high + padding)] as [number, number] }
}
