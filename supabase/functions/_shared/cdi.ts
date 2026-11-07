export interface CdiRate { date: string; value: number }

/** Publication dates, never execution time. Ten calendar days is a conservative
 * availability guard, not a substitute for a complete banking-holiday calendar. */
export function cdiPeriod(rates: CdiRate[], from: string, to: string) {
  const rows = rates.filter(row => row.date >= from && row.date < to).sort((a,b) => a.date.localeCompare(b.date))
  if (!rows.length) throw new Error(`CDI indisponível entre ${from} e ${to}; saldo anterior preservado`)
  let previous = from
  const dates = new Set<string>()
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || new Date(row.date).toISOString().slice(0,10) !== row.date || !Number.isFinite(Number(row.value)) || Number(row.value) < 0) throw new Error('Taxa ou data CDI inválida; saldo anterior preservado')
    if (dates.has(row.date)) throw new Error('Data CDI duplicada; saldo anterior preservado')
    dates.add(row.date)
    if ((Date.parse(row.date)-Date.parse(previous))/86400000 > 10) throw new Error(`Lacuna CDI entre ${previous} e ${row.date}; saldo anterior preservado`)
    previous = row.date
  }
  if ((Date.parse(to)-Date.parse(previous))/86400000 > 10) throw new Error(`CDI desatualizado: última referência ${previous}; saldo anterior preservado`)
  return { rows, referenceDate: previous }
}
