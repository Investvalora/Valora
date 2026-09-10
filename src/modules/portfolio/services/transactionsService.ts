import { supabase } from '../../../shared/services/supabaseClient'
import { parseDecimalPtBr } from '../schemas/positionSchema'
import type { NewTransaction } from '../types'
import type { CsvImportError, ParsedTransactionRow } from '../csv/csvParser'

function tickerError(row: ParsedTransactionRow): CsvImportError {
  return {
    row: row.rowNumber,
    column: 'ticker',
    message: 'Ativo não encontrado no catálogo.',
    example: 'Corrija para um ticker cadastrado, por exemplo PETR4, ou pule a linha.',
  }
}

export const transactionsService = {
  async validateTickers(rows: ParsedTransactionRow[]): Promise<ParsedTransactionRow[]> {
    const tickers = [...new Set(rows.map((row) => row.ticker).filter(Boolean))]
    if (tickers.length === 0) return rows

    const { data, error } = await supabase.from('assets').select('ticker').in('ticker', tickers).eq('active', true)
    if (error) throw error

    const knownTickers = new Set((data ?? []).map((asset) => String(asset.ticker).toUpperCase()))
    return rows.map((row) => {
      const errors = row.errors.filter((item) => item.column !== 'ticker' || item.message !== 'Ativo não encontrado no catálogo.')
      if (row.ticker && !knownTickers.has(row.ticker)) errors.push(tickerError(row))
      return { ...row, errors, selected: errors.length === 0 ? row.selected : false }
    })
  },

  async importTransactions(userId: string, rows: ParsedTransactionRow[]) {
    const selected = rows.filter((row) => row.selected && !row.skipped && row.errors.length === 0)
    const payload: NewTransaction[] = selected.map((row) => ({
      ticker: row.ticker,
      type: row.type as NewTransaction['type'],
      quantity: parseDecimalPtBr(row.quantity),
      price: parseDecimalPtBr(row.price),
      brokerage_fee: parseDecimalPtBr(row.brokerageFee || '0'),
      transaction_date: row.date,
    }))

    if (payload.length === 0) return 0
    const { error } = await supabase.from('transactions').insert(payload.map((transaction) => ({ ...transaction, user_id: userId })))
    if (error) throw error
    return payload.length
  },
}