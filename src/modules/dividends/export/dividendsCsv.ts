import type { DividendRow } from '../types'
import { DIVIDENDS_LIMIT } from '../utils/dividendConstants'
import { formatDividendDate } from '../utils/formatDate'

export const MAX_EXPORT_ROWS = DIVIDENDS_LIMIT
export const DIVIDENDS_CSV_FILENAME = 'proventos.csv'

const MISSING = '—'

const CSV_HEADERS = [
  'Ticker',
  'Tipo',
  'Data COM',
  'Data Pagamento',
  'Valor por Cota',
  'Quantidade',
  'Valor Total',
] as const

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

function formatQuantity(value: number): string {
  return Number.isFinite(value) ? quantityFormatter.format(value) : MISSING
}

function formatBRL(value: number): string {
  return Number.isFinite(value) ? brlFormatter.format(value).replace(/\u00a0/g, ' ') : MISSING
}

function formatDate(value: string | null | undefined): string {
  return formatDividendDate(value, MISSING)
}

/** Mesmo padrão de `positionsCsv.ts`: escapa campos com `;`, `"`, CR ou LF. */
function escapeCsvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function rowToFields(row: DividendRow): string[] {
  return [
    row.ticker || MISSING,
    row.type || MISSING,
    formatDate(row.ex_date),
    formatDate(row.payment_date),
    formatBRL(row.value_per_share),
    formatQuantity(row.quantity),
    formatBRL(row.total_value),
  ]
}

/** Serializa as linhas no formato CSV com BOM UTF-8 e separador `;`. */
export function serializeDividendsCsv(rows: DividendRow[]): string {
  const lines = [CSV_HEADERS.join(';')]

  for (const row of rows.slice(0, MAX_EXPORT_ROWS)) {
    lines.push(rowToFields(row).map(escapeCsvField).join(';'))
  }

  return `\uFEFF${lines.join('\r\n')}`
}

/** Dispara o download do arquivo `proventos.csv` com as linhas fornecidas. */
export function downloadDividendsCsv(
  rows: DividendRow[],
  filename = DIVIDENDS_CSV_FILENAME,
  documentRef: Document = document,
): void {
  if (rows.length === 0) return

  const blob = new Blob([serializeDividendsCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = documentRef.createElement('a')

  try {
    link.href = url
    link.download = filename
    link.setAttribute('aria-hidden', 'true')
    link.style.display = 'none'
    documentRef.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
