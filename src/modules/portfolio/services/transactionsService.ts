import { supabase } from '../../../shared/services/supabaseClient'
import { parseDecimalPtBr } from '../schemas/positionSchema'
import type { NewTransaction } from '../types'
import type { CsvImportError, ParsedTransactionRow } from '../csv/csvParser'

/** Linha completa de `public.transactions` retornada ao frontend. */
export interface Transaction {
  id: string
  seq: number
  user_id: string
  ticker: string
  type: 'buy' | 'sell' | 'dividend' | 'jcp' | 'bonus'
  quantity: number
  price: number
  brokerage_fee: number
  tax: number
  transaction_date: string
  created_at: string
}

/** Payload de criação de transação manual (buy/sell). */
export interface NewManualTransaction {
  ticker: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  brokerage_fee?: number
  transaction_date: string
}

const TRANSACTION_COLUMNS =
  'id, seq, user_id, ticker, type, quantity, price, brokerage_fee, tax, transaction_date, created_at'

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

  /**
   * Lista as transações de um ticker para o usuário.
   * Ordenadas por `transaction_date DESC, seq DESC` (mais recentes primeiro).
   */
  async listByTicker(userId: string, ticker: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(TRANSACTION_COLUMNS)
      .eq('user_id', userId)
      .eq('ticker', ticker.toUpperCase())
      .order('transaction_date', { ascending: false })
      .order('seq', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Transaction[]
  },

  /** Insere uma transação manual (buy ou sell). */
  async addManualTransaction(userId: string, payload: NewManualTransaction): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        ticker: payload.ticker.toUpperCase(),
        type: payload.type,
        quantity: payload.quantity,
        price: payload.price,
        brokerage_fee: payload.brokerage_fee ?? 0,
        tax: 0,
        transaction_date: payload.transaction_date,
      })
      .select(TRANSACTION_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as Transaction
  },

  /** Remove uma transação pelo id. RLS garante isolamento por user_id. */
  async deleteTransaction(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Lista todas as transações do usuário (todos os tickers).
   * Ordenadas por `transaction_date DESC, seq DESC`.
   * Limite de 2000 registros — suficiente para a tela de lançamentos no MVP.
   */
  async listAll(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(TRANSACTION_COLUMNS)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('seq', { ascending: false })
      .limit(2000)

    if (error) throw error
    return (data ?? []) as unknown as Transaction[]
  },
}
