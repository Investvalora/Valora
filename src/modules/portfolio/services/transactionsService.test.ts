import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { transactionsService } from './transactionsService'
import type { ParsedTransactionRow } from '../csv/csvParser'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const validRow: ParsedTransactionRow = {
  rowNumber: 2,
  date: '2026-09-10',
  ticker: 'PETR4',
  type: 'buy',
  quantity: '10',
  price: '32,10',
  brokerageFee: '0,50',
  errors: [],
  selected: true,
  skipped: false,
}

beforeEach(() => resetSupabaseMock())

describe('transactionsService', () => {
  it('marca ticker fora do catálogo com erro localizado', async () => {
    supabaseMock.on('assets', () => ({ data: [{ ticker: 'PETR4' }], error: null }))

    const rows = await transactionsService.validateTickers([validRow, { ...validRow, rowNumber: 3, ticker: 'INEXISTENTE' }])

    expect(rows[0].errors).toHaveLength(0)
    expect(rows[1].errors[0]).toMatchObject({ row: 3, column: 'ticker' })
    expect(rows[1].selected).toBe(false)
  })

  it('insere lote atômico com user_id da sessão', async () => {
    supabaseMock.on('transactions', () => ({ data: null, error: null }))

    await expect(transactionsService.importTransactions(USER_ID, [validRow])).resolves.toBe(1)

    expect(supabaseMock.insertPayloads('transactions')[0]).toEqual([
      {
        user_id: USER_ID,
        ticker: 'PETR4',
        type: 'buy',
        quantity: 10,
        price: 32.1,
        brokerage_fee: 0.5,
        transaction_date: '2026-09-10',
      },
    ])
  })
})