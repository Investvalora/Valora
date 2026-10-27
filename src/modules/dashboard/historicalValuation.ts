import type { FixedIncomePosition, FixedIncomeEvent } from '../portfolio/types'

export interface DatedRate { date: string; value: number }
export interface MacroRate extends DatedRate { series: string }
export type HistoricalFixedIncome = Pick<FixedIncomePosition, 'principal' | 'application_date'> & Partial<Pick<FixedIncomePosition, 'indexer' | 'rate' | 'maturity_date' | 'active'>> & { events?: FixedIncomeEvent[] }
export interface HistoricalValuation {
  usd: DatedRate[]
  macro: MacroRate[]
}

/** Última publicação até a data de corte; nunca usa taxa atual como substituta. */
export function rateAt(rates: DatedRate[], date: string): number | null {
  const latest = rates.filter((row) => row.date <= date && Number.isFinite(row.value) && row.value > 0).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest || (Date.parse(date) - Date.parse(latest.date)) / 86400000 > 10) return null
  return latest.value
}

/** Estimativa bruta contratual, sem marcação a mercado, IR ou IOF. */
function contractValueAt(position: HistoricalFixedIncome, date: string, macro: MacroRate[]): number | null {
  const from = position.application_date
  const to = position.maturity_date && position.maturity_date < date ? position.maturity_date : date
  if (from > date) return 0
  if (to <= from) return Number(position.principal)
  if (!position.indexer || position.rate === undefined) return null
  const principal = Number(position.principal)
  const rate = Number(position.rate)
  const days = (Date.parse(to) - Date.parse(from)) / 86400000
  if (!Number.isFinite(principal) || !Number.isFinite(rate) || rate < 0) return null
  // O cadastro atual registra Selic como taxa total anual, não como spread.
  // Preserva a semântica usada pelo calculador atual, sem somar Selic duas vezes.
  if (position.indexer === 'pre' || position.indexer === 'selic') return principal * (1 + rate / 100) ** (Math.round(days * 252 / 365) / 252)
  const series = macro.filter((row) => row.series === position.indexer).sort((a, b) => a.date.localeCompare(b.date))
  if (position.indexer === 'ipca') {
    // Registros SGS são datados no início do mês a que se referem.
    // Só acumula meses inteiros já encerrados no corte.
    const firstMonth = new Date(`${from.slice(0, 7)}-01T00:00:00Z`)
    if (from.slice(8) !== '01') firstMonth.setUTCMonth(firstMonth.getUTCMonth() + 1)
    let factor = 1
    while (true) {
      const next = new Date(firstMonth)
      next.setUTCMonth(next.getUTCMonth() + 1)
      const monthEnd = new Date(next.getTime() - 86400000).toISOString().slice(0, 10)
      if (monthEnd > to) break
      const row = series.find((item) => item.date.slice(0, 7) === firstMonth.toISOString().slice(0, 7))
      if (!row || !Number.isFinite(Number(row.value))) return null
      factor *= 1 + Number(row.value) / 100
      firstMonth.setUTCMonth(firstMonth.getUTCMonth() + 1)
    }
    return principal * factor * (1 + rate / 100) ** (days / 365)
  }
  // Cobertura nas extremidades evita preencher anos sem dados com uma taxa inventada.
  if (rateAt(series, from) === null || rateAt(series, to) === null) return null
  const rows = series.filter((row) => row.date >= from && row.date < to)
  if (!rows.length && days > 10) return null
  for (let index = 1; index < rows.length; index++) {
    if ((Date.parse(rows[index].date) - Date.parse(rows[index - 1].date)) / 86400000 > 10) return null
  }
  let factor = 1
  for (const row of rows) {
    if (!Number.isFinite(Number(row.value)) || Number(row.value) < 0) return null
    const daily = (1 + Number(row.value) / 100) ** (1 / 252) - 1
    factor *= 1 + daily * rate / 100
  }
  return principal * factor
}

function eventsAt(position: HistoricalFixedIncome, date: string) {
  return (position.events ?? []).filter((event) => event.event_date <= date).sort((a, b) => a.event_date.localeCompare(b.event_date) || a.seq - b.seq)
}

export function fixedIncomePrincipalAt(position: HistoricalFixedIncome, date: string): number {
  return Math.max(0, Number(position.principal) - eventsAt(position, date).reduce((sum, event) => sum + Number(event.principal_redeemed), 0))
}

/** O saldo informado no extrato após o evento é a nova base de capitalização. */
export function fixedIncomeAt(position: HistoricalFixedIncome, date: string, macro: MacroRate[]): number | null {
  const events = eventsAt(position, date)
  const latest = events[events.length - 1]
  if (!latest) {
    if (position.active === false && !(position.events ?? []).length) return null
    return contractValueAt(position, date, macro)
  }
  if (Number(latest.balance_after) === 0) return 0
  return contractValueAt({ ...position, principal: Number(latest.balance_after), application_date: latest.event_date }, date, macro)
}
