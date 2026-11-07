import type { ParsedTransactionRow } from './csvParser'
import { parseDecimalPtBr } from '../schemas/positionSchema'
import type { Transaction } from '../services/transactionsService'

function key(date: string, ticker: string, type: string, quantity: number, price: number, fee: number) {
  return JSON.stringify([date, ticker.toUpperCase(), type, quantity, price, fee])
}

/** A match is only a warning: two identical purchases can be legitimate. */
export function duplicateRows(rows: ParsedTransactionRow[], existing: Transaction[]): Set<number> {
  const previous = new Set(existing.map(row => key(row.transaction_date, row.ticker, row.type, Number(row.quantity), Number(row.price), Number(row.brokerage_fee))))
  const inFile = new Map<string, number[]>()
  const duplicates = new Set<number>()
  for (const row of rows) {
    if (row.errors.length) continue
    const signature = key(row.date, row.ticker, row.type, parseDecimalPtBr(row.quantity), parseDecimalPtBr(row.price), parseDecimalPtBr(row.brokerageFee || '0'))
    if (previous.has(signature)) duplicates.add(row.rowNumber)
    const numbers = inFile.get(signature) ?? []
    numbers.push(row.rowNumber)
    inFile.set(signature, numbers)
  }
  for (const numbers of inFile.values()) if (numbers.length > 1) for (const number of numbers) duplicates.add(number)
  return duplicates
}
