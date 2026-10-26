import type { PositionWithAsset } from '../portfolio/types'
import { fixedIncomeAt, fixedIncomePrincipalAt, rateAt } from './historicalValuation'
import type { HistoricalFixedIncome, HistoricalValuation } from './historicalValuation'
import type { PriceHistoryRow } from '../wealth/types'
import type { Transaction } from '../portfolio/services/transactionsService'

export type HistoricalTransaction = Pick<Transaction, 'ticker' | 'wallet_id' | 'transaction_date' | 'seq' | 'type' | 'quantity' | 'price'> & { currency: 'BRL' | 'USD' | null }

/** Fechamentos mensais reconstruídos por compras/vendas, sem cotações futuras.
 * Usa PTAX histórica e rendimento contratual quando as séries são fornecidas.
 * Posições sem movimentações usam o cadastro como saldo inicial.
 */
export function buildMonthlyWealth(
  positions: PositionWithAsset[],
  prices: PriceHistoryRow[],
  fixedIncome: HistoricalFixedIncome[],
  usdRate: number | null,
  until = new Date().toISOString().slice(0, 10),
  transactions: HistoricalTransaction[] = [],
  historical?: HistoricalValuation,
) {
  prices = prices.filter((row) => row.date <= until)
  const trades = transactions.filter((row) => row.type === 'buy' || row.type === 'sell').sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.seq - b.seq)
  const tradedKeys = new Set(trades.map((row) => `${row.wallet_id}:${row.ticker}`))
  const ledger = new Map<string, { ticker: string; currency: HistoricalTransaction['currency']; quantity: number; cost: number }>()
  let tradeCursor = 0
  const monthSet = new Set(prices.map((row) => row.date.slice(0, 7)))
  // Cotações antigas não iniciam uma carteira. Quando existe razão de movimentos,
  // ele define o início daquele ativo em vez da data legada da posição.
  const firstDate = [...trades.filter((row) => row.type === 'buy' && Number(row.quantity) > 0 && row.transaction_date <= until).map((row) => row.transaction_date),
    ...positions.filter((row) => !tradedKeys.has(`${row.wallet_id}:${row.ticker}`) && Number(row.quantity) > 0).map((row) => row.acquisition_date),
    ...fixedIncome.filter((row) => Number(row.principal) > 0).map((row) => row.application_date)]
    .filter((date): date is string => Boolean(date) && date <= until).sort()[0]
  if (!firstDate) return []
  if (firstDate) {
    const date = new Date(`${firstDate.slice(0, 7)}-01T00:00:00Z`)
    while (date.toISOString().slice(0, 7) <= until.slice(0, 7)) {
      monthSet.add(date.toISOString().slice(0, 7))
      date.setUTCMonth(date.getUTCMonth() + 1)
    }
  }
  const months = [...monthSet].filter((month) => month >= firstDate.slice(0, 7) && month <= until.slice(0, 7)).sort()
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))
  const latest = new Map<string, number>()
  let cursor = 0
  return months.map((month) => {
    const endOfMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
    const cutoff = endOfMonth < until ? endOfMonth : until
    const monthlyUsd = historical ? rateAt(historical.usd, cutoff) : usdRate
    while (tradeCursor < trades.length && trades[tradeCursor].transaction_date <= until && trades[tradeCursor].transaction_date.slice(0, 7) <= month) {
      const trade = trades[tradeCursor++]
      const key = `${trade.wallet_id}:${trade.ticker}`
      const state = ledger.get(key) ?? { ticker: trade.ticker, currency: trade.currency, quantity: 0, cost: 0 }
      const quantity = Number(trade.quantity)
      if (trade.type === 'buy') {
        state.cost += Math.max(0, quantity + Math.min(state.quantity, 0)) * Number(trade.price)
        state.quantity += quantity
      } else {
        if (state.quantity > 0) state.cost -= state.cost / state.quantity * Math.min(quantity, state.quantity)
        state.quantity -= quantity
        if (state.quantity <= 0) state.cost = 0
      }
      ledger.set(key, state)
    }
    while (cursor < sorted.length && sorted[cursor].date.slice(0, 7) <= month) {
      const row = sorted[cursor++]
      if (Number.isFinite(Number(row.close)) && Number(row.close) > 0) latest.set(row.ticker, Number(row.close))
    }
    let total = 0
    let invested = 0
    let complete = true
    let hasPosition = false
    for (const state of ledger.values()) {
      if (state.quantity <= 0) continue
      hasPosition = true
      const rate = state.currency === 'USD' ? monthlyUsd : state.currency === 'BRL' ? 1 : null
      const close = latest.get(state.ticker)
      if (rate === null || close === undefined) { complete = false; continue }
      total += state.quantity * close * rate
      invested += state.cost * rate
    }
    for (const position of positions) {
      if (tradedKeys.has(`${position.wallet_id}:${position.ticker}`)) continue
      if (position.acquisition_date > cutoff) continue
      hasPosition = true
      const rate = position.asset?.currency === 'USD' ? monthlyUsd : 1
      const close = latest.get(position.ticker)
      if (rate === null || close === undefined) { complete = false; continue }
      total += Number(position.quantity) * close * rate
      invested += Number(position.quantity) * Number(position.average_price) * rate
    }
    for (const position of fixedIncome) {
      if (position.application_date > cutoff) continue
      hasPosition = true
      const value = historical ? fixedIncomeAt(position, cutoff, historical.macro) : Number(position.principal)
      if (value === null) { complete = false; continue }
      total += value
      invested += fixedIncomePrincipalAt(position, cutoff)
    }
    return {
      month,
      totalBRL: complete && (hasPosition || ledger.size > 0) ? total : null,
      investedBRL: complete && (hasPosition || ledger.size > 0) ? invested : null,
    }
  }).filter((point) => point.totalBRL !== null)
}
