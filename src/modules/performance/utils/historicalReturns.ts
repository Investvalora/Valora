import type { PositionWithAsset, AssetCurrency } from '../../portfolio/types'
import type { Transaction } from '../../portfolio/services/transactionsService'
import type { PriceHistoryRow } from '../../wealth/types'
import { fixedIncomeAt, rateAt } from '../../dashboard/historicalValuation'
import type { HistoricalFixedIncome, HistoricalValuation } from '../../dashboard/historicalValuation'
import type { DividendRow } from '../../dividends/types'

export type ReturnTrade = Pick<Transaction, 'wallet_id' | 'ticker' | 'transaction_date' | 'seq' | 'type' | 'quantity' | 'price'> & Partial<Pick<Transaction, 'brokerage_fee' | 'tax'>> & { currency: AssetCurrency | null }
export interface DailyReturn { date: string; value: number | null; returnPct: number | null }
const key = (row: { wallet_id?: string; ticker: string }) => `${row.wallet_id}:${row.ticker}`
const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)

/** Retorno diário sobre capital exposto: (saldo final + saídas + renda) /
 * (saldo anterior + entradas) - 1. Compras entram no início do dia e vendas
 * saem ao final; sem horários de execução, esta convenção é uma aproximação
 * explícita. Nunca usa quantidade atual retroativamente, cotação futura ou FX atual.
 */
export function historicalReturns(
  positions: PositionWithAsset[], trades: ReturnTrade[], prices: PriceHistoryRow[],
  fixed: HistoricalFixedIncome[], rates: HistoricalValuation, until: string,
  income: DividendRow[] = [],
): DailyReturn[] {
  const movements = trades.filter(t => (t.type === 'buy' || t.type === 'sell') && t.transaction_date <= until)
  const traded = new Set(movements.map(key))
  // Cadastro sem movimentos é uma posição de abertura, nunca retroativa à aquisição.
  const opening: ReturnTrade[] = positions.filter(p => !traded.has(key(p)) && Number(p.quantity) > 0).map(p => ({
    wallet_id: p.wallet_id!, ticker: p.ticker, transaction_date: p.acquisition_date,
    seq: -1, type: 'buy', quantity: Number(p.quantity), price: Number(p.average_price), currency: p.asset?.currency ?? null,
  }))
  const ordered = [...movements, ...opening].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.seq - b.seq)
  const first = [...ordered.map(t => t.transaction_date), ...fixed.map(p => p.application_date)].filter(d => d && d <= until).sort()[0]
  if (!first) return []
  const sortedPrices = [...prices].filter(p => p.date <= until && p.close != null && Number.isFinite(Number(p.close)) && Number(p.close) > 0).sort((a, b) => a.date.localeCompare(b.date))
  const quotes = new Map<string, { date: string; close: number }>()
  const holdings = new Map<string, { ticker: string; currency: AssetCurrency | null; quantity: number }>()
  const finalQuantities = new Map<string, number>()
  for (const trade of ordered) finalQuantities.set(key(trade), (finalQuantities.get(key(trade)) ?? 0) + Number(trade.quantity) * (trade.type === 'sell' ? -1 : 1))
  const currentQuantities = new Map(positions.map(p => [key(p), Number(p.quantity)]))
  // Divergência significa razão incompleto. Não inventar um saldo inicial.
  const inconsistent = [...finalQuantities].some(([k, qty]) => Math.abs(qty - (currentQuantities.get(k) ?? 0)) > 1e-7)
  let cursor = 0, priceCursor = 0
  let previous: number | null = 0
  const result: DailyReturn[] = []
  for (let date = first; date <= until; date = nextDay(date)) {
    while (priceCursor < sortedPrices.length && sortedPrices[priceCursor].date <= date) {
      const row = sortedPrices[priceCursor++]
      quotes.set(row.ticker, { date: row.date, close: Number(row.close) })
    }
    const fx = rateAt(rates.usd, date)
    const convert = (currency: string | null | undefined) => currency === 'BRL' ? 1 : currency === 'USD' ? fx : null
    const quoteAt = (ticker: string): number | null => {
      const row = quotes.get(ticker)
      if (row && (Date.parse(date) - Date.parse(row.date)) / 86400000 <= 10) return row.close
      // Par BRL pode usar história USD apenas com câmbio histórico da mesma data.
      if (!row && ticker.endsWith('-BRL')) {
        const usd = quotes.get(ticker.slice(0, -4))
        if (usd && fx !== null && (Date.parse(date) - Date.parse(usd.date)) / 86400000 <= 10) return usd.close * fx
      }
      return null
    }
    let complete = !inconsistent, purchases = 0, withdrawals = 0, total = 0
    while (cursor < ordered.length && ordered[cursor].transaction_date <= date) {
      const trade = ordered[cursor++]
      const qty = Number(trade.quantity), price = Number(trade.price)
      const rate = convert(trade.currency)
      const fees = Number(trade.brokerage_fee ?? 0) + Number(trade.tax ?? 0)
      if (rate === null || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(fees)) complete = false
      const state = holdings.get(key(trade)) ?? { ticker: trade.ticker, currency: trade.currency, quantity: 0 }
      if (trade.type === 'buy') { state.quantity += qty; purchases += (qty * price + fees) * (rate ?? 0) }
      else { state.quantity -= qty; withdrawals += (qty * price - fees) * (rate ?? 0) }
      if (state.quantity < -1e-7) complete = false
      holdings.set(key(trade), state)
    }
    for (const state of holdings.values()) {
      if (state.quantity <= 1e-10) continue
      const close = quoteAt(state.ticker), rate = convert(state.currency)
      if (close === null || rate === null) complete = false
      else total += state.quantity * close * rate
    }
    for (const position of fixed) {
      if (position.application_date > date) continue
      if (position.application_date === date) purchases += Number(position.principal)
      const value = fixedIncomeAt(position, date, rates.macro)
      if (value === null || !Number.isFinite(value)) complete = false
      else total += value
      withdrawals += (position.events ?? []).filter(e => e.event_date === date).reduce((sum, e) => sum + Number(e.amount), 0)
    }
    for (const payment of income.filter(p => p.payment_date === date)) {
      const rate = convert(payment.currency ?? 'BRL')
      if (rate === null || !Number.isFinite(Number(payment.total_value))) complete = false
      else withdrawals += Number(payment.total_value) * rate
    }
    const denominator = previous === null ? null : previous + purchases
    const daily = complete && denominator !== null && denominator > 0 ? (total + withdrawals) / denominator - 1
      : complete && previous === 0 && purchases === 0 && total === 0 ? 0 : null
    result.push({ date, value: complete ? total : null, returnPct: daily !== null && Number.isFinite(daily) && daily >= -1 ? daily : null })
    previous = complete ? total : null
  }
  return result
}

/** Mês incompleto fica ausente da tabela. Lacunas impedem o acumulado do período,
 * sem juntar silenciosamente trechos desconexos. Mês corrente não é fechado. */
export function summarizeHistoricalReturns(points: DailyReturn[], since: string, today: string) {
  const selected = points.filter(p => p.date >= since && p.date.slice(0, 7) < today.slice(0, 7))
  const monthly = new Map<string, number>()
  const missingMonths = new Set<string>()
  let factor = 1
  for (const point of selected) {
    const month = point.date.slice(0, 7)
    if (point.returnPct === null) missingMonths.add(month)
    else {
      factor *= 1 + point.returnPct
      monthly.set(month, (1 + (monthly.get(month) ?? 0)) * (1 + point.returnPct) - 1)
    }
  }
  for (const month of missingMonths) monthly.delete(month)
  const incomplete = missingMonths.size > 0
  // Carteira iniciada no mês corrente: permite apenas o retorno diário disponível.
  const fallback = selected.length === 0 ? points.filter(p => p.date >= since && p.date <= today) : []
  const fallbackComplete = fallback.length > 0 && fallback.every(p => p.returnPct !== null)
  return { monthly, missingMonths, incomplete: incomplete || (fallback.length > 0 && !fallbackComplete),
    returnPct: selected.length ? incomplete ? null : factor - 1
      : fallbackComplete ? fallback.reduce((f, p) => f * (1 + p.returnPct!), 1) - 1 : null,
    startDate: (selected[0] ?? fallback[0])?.date ?? null }
}
