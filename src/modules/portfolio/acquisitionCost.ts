import { rateAt, type DatedRate } from '../dashboard/historicalValuation'
import type { Transaction } from './services/transactionsService'
import type { PositionWithAsset } from './types'

export type CostTransaction = Pick<Transaction, 'wallet_id' | 'ticker' | 'transaction_date' | 'seq' | 'type' | 'quantity' | 'price'> & Partial<Pick<Transaction, 'brokerage_fee' | 'tax'>>

/** Remaining acquisition cost in BRL. PTAX is a historical reference, not the
 * investor's actual remittance exchange rate. Quotes/current FX never enter it.
 */
export function acquisitionCostBRL(position: PositionWithAsset, transactions: CostTransaction[], rates: DatedRate[]): number | null {
  const nativeCost = Number(position.quantity) * Number(position.average_price)
  if (!Number.isFinite(nativeCost) || nativeCost < 0) return null
  const usd = position.asset?.currency === 'USD'
  const trades = transactions.filter(t => t.wallet_id === position.wallet_id && t.ticker === position.ticker && (t.type === 'buy' || t.type === 'sell'))
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.seq - b.seq)
  if (!trades.length) {
    if (!usd) return nativeCost
    const rate = rateAt(rates, position.acquisition_date)
    return rate === null ? null : nativeCost * rate
  }
  let quantity = 0
  let cost: number | null = 0
  let originalCost = 0
  for (const trade of trades) {
    const amount = Number(trade.quantity)
    if (trade.type === 'buy') {
      const purchased = Math.max(0, amount + Math.min(quantity, 0))
      const purchaseCost = purchased * (Number(trade.price) + (Number(trade.brokerage_fee ?? 0) + Number(trade.tax ?? 0)) / amount)
      const rate = usd ? rateAt(rates, trade.transaction_date) : 1
      originalCost += purchaseCost
      if (purchased > 0) cost = cost === null || rate === null ? null : cost + purchaseCost * rate
      quantity += amount
    } else {
      const remaining = quantity > 0 ? 1 - Math.min(amount, quantity) / quantity : 0
      originalCost *= remaining
      if (cost !== null) cost *= remaining
      quantity -= amount
      if (quantity <= 0) { cost = 0; originalCost = 0 }
    }
  }
  // Do not pretend a partial/incompatible ledger is a full cost history.
  if (Math.abs(quantity - Number(position.quantity)) > 1e-8 || Math.abs(originalCost - nativeCost) > Number(position.quantity) * 0.000051 + 1e-7) return null
  return cost !== null && Number.isFinite(cost) ? cost : null
}
