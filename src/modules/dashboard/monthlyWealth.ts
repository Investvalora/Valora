import type { PositionWithAsset, FixedIncomePosition } from '../portfolio/types'
import type { PriceHistoryRow } from '../wealth/types'

/** Fechamentos mensais das posições cadastradas, sem usar cotações futuras.
 * Usa o câmbio disponível hoje, como o restante da série de patrimônio.
 * Não reconstrói posições já vendidas nem rendimentos históricos de renda fixa.
 */
export function buildMonthlyWealth(
  positions: PositionWithAsset[],
  prices: PriceHistoryRow[],
  fixedIncome: Pick<FixedIncomePosition, 'principal' | 'application_date'>[],
  usdRate: number | null,
  until = new Date().toISOString().slice(0, 10),
) {
  const monthSet = new Set(prices.map((row) => row.date.slice(0, 7)))
  if (positions.length === 0 && fixedIncome.length > 0) {
    const first = fixedIncome.map((position) => position.application_date).sort()[0]
    const date = new Date(`${first.slice(0, 7)}-01T00:00:00Z`)
    while (date.toISOString().slice(0, 7) <= until.slice(0, 7)) {
      monthSet.add(date.toISOString().slice(0, 7))
      date.setUTCMonth(date.getUTCMonth() + 1)
    }
  }
  const months = [...monthSet].sort()
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))
  const latest = new Map<string, number>()
  let cursor = 0
  return months.map((month) => {
    while (cursor < sorted.length && sorted[cursor].date.slice(0, 7) <= month) {
      const row = sorted[cursor++]
      if (Number.isFinite(Number(row.close)) && Number(row.close) > 0) latest.set(row.ticker, Number(row.close))
    }
    let total = 0
    let invested = 0
    let complete = true
    let hasPosition = false
    for (const position of positions) {
      if (position.acquisition_date.slice(0, 7) > month) continue
      hasPosition = true
      const rate = position.asset?.currency === 'USD' ? usdRate : 1
      const close = latest.get(position.ticker)
      if (rate === null || close === undefined) { complete = false; continue }
      total += Number(position.quantity) * close * rate
      invested += Number(position.quantity) * Number(position.average_price) * rate
    }
    for (const position of fixedIncome) {
      if (position.application_date.slice(0, 7) > month) continue
      hasPosition = true
      // Sem snapshots históricos, mantém somente o principal naquele mês.
      total += Number(position.principal)
      invested += Number(position.principal)
    }
    return {
      month,
      totalBRL: complete && hasPosition ? total : null,
      investedBRL: complete && hasPosition ? invested : null,
    }
  }).filter((point) => point.totalBRL !== null)
}
