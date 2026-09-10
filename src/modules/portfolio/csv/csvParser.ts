import { parseDecimalPtBr } from '../schemas/positionSchema'
import type { TransactionType } from '../types'

export const MAX_IMPORT_ROWS = 1000
export const MAX_PREVIEW_ROWS = 500

const REQUIRED_COLUMNS = ['data', 'ticker', 'tipo', 'quantidade', 'preço', 'corretagem'] as const
const TRANSACTION_TYPES: TransactionType[] = ['buy', 'sell', 'dividend', 'jcp', 'bonus']

export interface CsvImportError {
  row: number
  column: string
  message: string
  example: string
}

export interface ParsedTransactionRow {
  rowNumber: number
  date: string
  ticker: string
  type: TransactionType | ''
  quantity: string
  price: string
  brokerageFee: string
  errors: CsvImportError[]
  selected: boolean
  skipped: boolean
}

export interface CsvParseResult {
  rows: ParsedTransactionRow[]
  errors: CsvImportError[]
  totalRows: number
  previewRows: number
}

function decodeCsv(input: string | ArrayBuffer): string {
  if (typeof input === 'string') return input.replace(/^\uFEFF/, '')

  const bytes = new Uint8Array(input)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes).replace(/^\uFEFF/, '')
  }
}

function splitCsvLine(line: string, separator: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === separator && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  values.push(value.trim())
  return values
}

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function error(row: number, column: string, message: string, example: string): CsvImportError {
  return { row, column, message, example }
}

function parseDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, first, second, yearOrDay] = match
  const year = match[0].includes('/') ? yearOrDay : first
  const month = match[0].includes('/') ? second : second
  const day = match[0].includes('/') ? first : match[3]
  const iso = `${year}-${month}-${day}`
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === iso && iso <= new Date().toISOString().slice(0, 10)
}

function toIsoDate(value: string): string {
  if (value.includes('/')) {
    const [day, month, year] = value.split('/')
    return `${year}-${month}-${day}`
  }
  return value
}

export function parseCsvTransactions(input: string | ArrayBuffer): CsvParseResult {
  const text = decodeCsv(input)
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    const issue = error(1, 'arquivo', 'O arquivo está vazio.', 'Inclua o cabeçalho e ao menos uma transação.')
    return { rows: [], errors: [issue], totalRows: 0, previewRows: 0 }
  }

  const separator = lines[0].includes(';') ? ';' : ','
  const headers = splitCsvLine(lines[0], separator).map(normalizeHeader)
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(normalizeHeader(column)))
  if (missing.length > 0) {
    const issue = error(1, 'cabeçalho', `Coluna obrigatória ausente: ${missing.join(', ')}.`, REQUIRED_COLUMNS.join(';'))
    return { rows: [], errors: [issue], totalRows: Math.max(lines.length - 1, 0), previewRows: 0 }
  }

  const totalRows = lines.length - 1
  if (totalRows > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [error(0, 'arquivo', `O arquivo contém ${totalRows} transações; o limite é ${MAX_IMPORT_ROWS}.`, 'Envie até 1000 transações.')],
      totalRows,
      previewRows: 0,
    }
  }

  const indexes = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, headers.indexOf(normalizeHeader(column))])) as Record<(typeof REQUIRED_COLUMNS)[number], number>
  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = splitCsvLine(line, separator)
    const date = values[indexes.data] ?? ''
    const ticker = (values[indexes.ticker] ?? '').toUpperCase()
    const rawType = (values[indexes.tipo] ?? '').toLowerCase() as TransactionType
    const quantity = values[indexes.quantidade] ?? ''
    const price = values[indexes.preço] ?? ''
    const brokerageFee = values[indexes.corretagem] ?? ''
    const errors: CsvImportError[] = []

    if (!parseDate(date)) errors.push(error(rowNumber, 'data', 'Data inválida ou futura.', 'DD/MM/AAAA'))
    if (!ticker) errors.push(error(rowNumber, 'ticker', 'Ticker obrigatório.', 'PETR4'))
    if (!TRANSACTION_TYPES.includes(rawType)) errors.push(error(rowNumber, 'tipo', 'Tipo de transação inválido.', 'buy, sell, dividend, jcp ou bonus'))
    const parsedQuantity = parseDecimalPtBr(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) errors.push(error(rowNumber, 'quantidade', 'Quantidade deve ser maior que zero.', '100 ou 0,5'))
    const parsedPrice = parseDecimalPtBr(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) errors.push(error(rowNumber, 'preço', 'Preço deve ser um número não negativo.', '32,10'))
    const parsedBrokerage = parseDecimalPtBr(brokerageFee || '0')
    if (!Number.isFinite(parsedBrokerage) || parsedBrokerage < 0) errors.push(error(rowNumber, 'corretagem', 'Corretagem deve ser um número não negativo.', '0,00'))
    const type: TransactionType | '' = TRANSACTION_TYPES.includes(rawType) ? rawType : ''

    return {
      rowNumber,
      date: toIsoDate(date),
      ticker,
      type,
      quantity,
      price,
      brokerageFee: brokerageFee || '0',
      errors,
      selected: errors.length === 0,
      skipped: false,
    }
  })

  return { rows, errors: rows.flatMap((row) => row.errors), totalRows, previewRows: Math.min(rows.length, MAX_PREVIEW_ROWS) }
}