import type { AssetReturnRow } from '../types'

export const MAX_ASSET_RETURN_ROWS = 1000
export const ASSET_RETURN_CSV_FILENAME = 'rentabilidade-por-ativo.csv'

const MISSING = '—'

const CSV_HEADERS = [
  'Ticker',
  'Nome',
  'Retorno Total %',
  'Ganho de Capital %',
  'Proventos (R$)',
  'Proventos %',
] as const

const pctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return `${pctFormatter.format(value)}%`
}

function formatBRL(value: number): string {
  return brlFormatter.format(value).replace(/\u00a0/g, ' ')
}

export function escapeCsvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function rowToFields(row: AssetReturnRow): string[] {
  return [
    row.ticker,
    row.name ?? MISSING,
    formatPct(row.totalReturnPct),
    formatPct(row.capitalGainPct),
    formatBRL(row.dividendsReceived),
    formatPct(row.dividendsPct),
  ]
}

export function serializeAssetReturnCsv(rows: AssetReturnRow[]): string {
  const lines = [CSV_HEADERS.join(';')]

  for (const row of rows.slice(0, MAX_ASSET_RETURN_ROWS)) {
    lines.push(rowToFields(row).map(escapeCsvField).join(';'))
  }

  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadAssetReturnCsv(
  rows: AssetReturnRow[],
  filename = ASSET_RETURN_CSV_FILENAME,
  documentRef: Document = document,
): void {
  if (rows.length === 0) return

  const blob = new Blob([serializeAssetReturnCsv(rows)], { type: 'text/csv;charset=utf-8' })
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
