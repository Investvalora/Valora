import { bankingHolidays } from './bankingHolidays.ts'
export interface CdiRate { date: string; value: number }
const dayMs = 86400000
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
}
function nextDay(value: string): string { return new Date(Date.parse(value)+dayMs).toISOString().slice(0,10) }
function bankingDay(value: string): boolean {
  const holidays = bankingHolidays[value.slice(0,4)]
  if (!holidays) throw new Error(`Calendário bancário indisponível para ${value.slice(0,4)}; saldo anterior preservado`)
  const weekday = new Date(value).getUTCDay()
  return weekday !== 0 && weekday !== 6 && !holidays.includes(value)
}
/** Exact banking-day coverage, never a calendar-day approximation. One recent
 * unpublished business day may lag; it is not accrued or labelled as valued. */
export function cdiPeriod(rates: CdiRate[], from: string, to: string, asOf = new Date().toISOString().slice(0,10)) {
  if (![from,to,asOf].every(validDate) || from >= to || to > asOf) throw new Error('Período CDI inválido; saldo anterior preservado')
  const rows = rates.filter(row => row.date >= from && row.date < to).sort((a,b) => a.date.localeCompare(b.date))
  if (!rows.length) throw new Error(`CDI indisponível entre ${from} e ${to}; saldo anterior preservado`)
  const dates = new Set<string>()
  for (const row of rows) {
    if (!validDate(row.date) || !Number.isFinite(Number(row.value)) || Number(row.value) < 0 || !bankingDay(row.date)) throw new Error('Taxa ou data CDI inválida; saldo anterior preservado')
    if (dates.has(row.date)) throw new Error('Data CDI duplicada; saldo anterior preservado')
    dates.add(row.date)
  }
  // Count real banking days before execution, not elapsed calendar days.
  let mostRecent = new Date(Date.parse(asOf)-dayMs).toISOString().slice(0,10)
  while (!bankingDay(mostRecent)) mostRecent = new Date(Date.parse(mostRecent)-dayMs).toISOString().slice(0,10)
  const missing: string[] = []
  for (let date=from;date<to;date=nextDay(date)) if (bankingDay(date) && !dates.has(date)) missing.push(date)
  const referenceDate = rows[rows.length-1].date
  if (missing.length && !(missing.length===1 && missing[0]===mostRecent && missing[0]>referenceDate)) {
    throw new Error(`Lacuna CDI em ${missing.slice(0,5).join(', ')}${missing.length>5 ? ` (+${missing.length-5} datas)` : ''}; última referência ${referenceDate}; saldo anterior preservado`)
  }
  return { rows, referenceDate }
}
