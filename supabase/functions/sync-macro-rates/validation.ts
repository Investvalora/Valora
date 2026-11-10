import { validIso } from '../_shared/officialFiles.ts'
/** Reject malformed series as a whole: partial ingestion must not look complete. */
export function macroRows(entries: unknown, series: string, today: string) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('invalid_macro_series')
  return entries.map((entry: { data?: unknown; valor?: unknown }) => {
    if (typeof entry.data !== 'string' || typeof entry.valor !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(entry.data) || !/^-?\d+(\.\d+)?$/.test(entry.valor)) throw new Error('invalid_macro_entry')
    const [day, month, year] = entry.data.split('/'), date = `${year}-${month}-${day}`, value = Number(entry.valor)
    if (!validIso(date) || date > today || !Number.isFinite(value) || (series !== 'ipca' && value < 0)) throw new Error('invalid_macro_entry')
    return { series, date, value }
  })
}
