import { expect, it } from 'vitest'
import { duplicateRows } from './duplicatePreview'
import { parseCsvTransactions } from './csvParser'
import type { Transaction } from '../services/transactionsService'
it('aponta coincidências no arquivo e no histórico sem desmarcar compras legítimas', () => {
  const rows = parseCsvTransactions('data;ticker;tipo;quantidade;preço;corretagem\n2026-01-05;PETR4;buy;1;30;0\n2026-01-05;PETR4;buy;1;30;0\n2026-01-06;VALE3;buy;2;60;0').rows
  const history = [{ transaction_date: '2026-01-06', ticker: 'VALE3', type: 'buy', quantity: 2, price: 60, brokerage_fee: 0 }] as Transaction[]
  expect([...duplicateRows(rows, history)]).toEqual([4, 2, 3])
  expect(rows.every(row => row.selected)).toBe(true)
})
