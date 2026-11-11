import type { PerformanceSeries } from '../types'

export function comparisonChart(series: PerformanceSeries[]) {
  const valid = (value: number) => value !== null && Number.isFinite(value)
  const portfolioDates = series.find((item) => item.label === 'Carteira')?.points.filter((point) => valid(point.normalized)).map((point) => point.date).sort() ?? []
  const from = portfolioDates[0]
  const until = portfolioDates[portfolioDates.length - 1]
  const visible = series.map((item) => ({ ...item, points: item.points.filter((point) => (!from || point.date >= from) && (!until || point.date <= until)) }))
  // Uma linha por data e uma chave por série: o tooltip compartilhado do
  // Recharts não pode resolver todas as curvas pelo mesmo dataKey.
  const validDates = visible.flatMap(item => item.points.filter(point => valid(point.normalized)).map(point => point.date)).sort()
  const dates = [...new Set(visible.flatMap((item) => item.points.map((point) => point.date)))].sort()
    .filter(date => validDates.length > 0 && date >= validDates[0] && date <= validDates[validDates.length - 1])
  const keyedSeries = visible.map((item, index) => ({ ...item, dataKey: `series${index}` }))
  const lookup = keyedSeries.map(item => new Map(item.points.map(point => [point.date, point.normalized])))
  const data: Array<{ date: number } & Record<string, number | null>> = dates.map(date => ({
    date: Date.parse(`${date}T12:00:00Z`),
    ...Object.fromEntries(keyedSeries.map((item, index) => [item.dataKey, lookup[index].get(date) ?? null])),
  }))
  const values = visible.flatMap((item) => item.points.map((point) => point.normalized).filter(valid))
  const low = Math.min(100, ...values), high = Math.max(100, ...values)
  const padding = Math.max(1, (high - low) * 0.15)
  return { series: keyedSeries, dates, data, domain: [Math.floor(low - padding), Math.ceil(high + padding)] as [number, number] }
}
