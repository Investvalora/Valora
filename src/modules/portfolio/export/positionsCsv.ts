import type { PositionRow } from '../types'

export const MAX_EXPORT_ROWS = 1000
export const POSITIONS_CSV_FILENAME = 'carteira.csv'

const MISSING = '—'
const CSV_HEADERS = [
  'Ticker',
  'Nome',
  'Quantidade',
  'Preço médio',
  'Cotação',
  'Valor de mercado',
  'Peso',
  'Variação',
  'Data de aquisição',
] as const

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

const plainMoneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const signedPercentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)
}

function formatMoney(value: number, currency: unknown): string {
  if (!Number.isFinite(value)) return MISSING
  if (!isCurrencyCode(currency)) return plainMoneyFormatter.format(value).replace(/\u00a0/g, ' ')

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
    .format(value)
    .replace(/\u00a0/g, ' ')
}

function formatQuantity(value: number): string {
  return Number.isFinite(value) ? quantityFormatter.format(value) : MISSING
}

function formatBRL(value: number | null): string {
  return value !== null && Number.isFinite(value)
    ? brlFormatter.format(value).replace(/\u00a0/g, ' ')
    : MISSING
}

function formatWeight(value: number | null): string {
  return value !== null && Number.isFinite(value) ? `${percentFormatter.format(value)}%` : MISSING
}

function formatChange(value: number | null): string {
  return value !== null && Number.isFinite(value)
    ? `${signedPercentFormatter.format(value)}%`
    : MISSING
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || MISSING
}

function escapeCsvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function rowToFields(row: PositionRow): string[] {
  return [
    row.ticker || MISSING,
    row.name ?? MISSING,
    formatQuantity(row.quantity),
    formatMoney(row.averagePrice, row.currency),
    formatMoney(row.quotePrice, row.currency),
    formatBRL(row.marketValueBRL),
    formatWeight(row.weightPercent),
    formatChange(row.changePercent),
    formatDate(row.acquisitionDate),
  ]
}

export function serializePositionsCsv(rows: PositionRow[]): string {
  const lines = [CSV_HEADERS.join(';')]

  for (const row of rows.slice(0, MAX_EXPORT_ROWS)) {
    lines.push(rowToFields(row).map(escapeCsvField).join(';'))
  }

  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadPositionsCsv(
  rows: PositionRow[],
  filename = POSITIONS_CSV_FILENAME,
  documentRef: Document = document,
): void {
  if (rows.length === 0) return

  const blob = new Blob([serializePositionsCsv(rows)], { type: 'text/csv;charset=utf-8' })
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
