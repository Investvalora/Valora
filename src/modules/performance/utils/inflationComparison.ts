import type { PerformanceSeries } from '../types'

export interface MonthlyInflation { date: string; value: number }
const monthEnd = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10)
const nextEnd = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) + 1, 0)).toISOString().slice(0, 10)

/** Compara apenas meses inteiros. Não cria inflação diária ou atravessa lacunas. */
export function inflationComparison(portfolio: PerformanceSeries, rates: MonthlyInflation[], today: string): PerformanceSeries[] {
  const points = [...portfolio.points].sort((a, b) => a.date.localeCompare(b.date))
  const empty = [{ label: 'Carteira', color: portfolio.color, points: [] }, { label: 'IPCA', color: '#a78bfa', points: [] }] as PerformanceSeries[]
  if (!points.length) return empty
  const known = new Map(rates.filter(row => row.date.slice(0, 7) < today.slice(0, 7) && Number.isFinite(Number(row.value)) && Number(row.value) > -100)
    .map(row => [row.date.slice(0, 7), Number(row.value)]))
  const at = (date: string) => {
    const candidates = points.filter(p => p.date <= date)
    const row = candidates[candidates.length - 1]
    return row && row.normalized !== null && Number.isFinite(row.normalized) && row.normalized > 0 &&
      (Date.parse(date) - Date.parse(row.date)) / 86400000 <= 7 ? row : null
  }
  const firstPublishedMonth = [...known.keys()].sort()[0]
  if (!firstPublishedMonth) return empty
  const beforePublished = new Date(Date.UTC(Number(firstPublishedMonth.slice(0, 4)), Number(firstPublishedMonth.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10)
  const baseDate = monthEnd(points[0].date) > beforePublished ? monthEnd(points[0].date) : beforePublished
  const base = at(baseDate)
  if (!base || baseDate >= today) return empty
  const end = monthEnd(points[points.length - 1].date)
  const wallet = [{ date: baseDate, normalized: 100 }]
  const inflation = [{ date: baseDate, normalized: 100 }]
  let factor = 100
  for (let date = nextEnd(baseDate); date <= end && date.slice(0, 7) < today.slice(0, 7); date = nextEnd(date)) {
    const rate = known.get(date.slice(0, 7))
    const value = at(date)
    const gap = points.some(p => p.date > baseDate && p.date <= date && (p.normalized === null || !Number.isFinite(p.normalized)))
    if (rate === undefined || !value || gap) break
    factor *= 1 + rate / 100
    inflation.push({ date, normalized: factor })
    wallet.push({ date, normalized: value.normalized / base.normalized * 100 })
  }
  return wallet.length < 2 ? empty : [{ ...empty[0], points: wallet }, { ...empty[1], points: inflation }]
}
