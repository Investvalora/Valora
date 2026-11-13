import { rateAt, type DatedRate } from '../dashboard/historicalValuation'
import type { AssetType } from './types'
import type { Transaction } from './services/transactionsService'

export interface AporteAsset { type: AssetType | null; currency: string }
export interface MonthlyAportePoint {
  month: string
  compras: number | null
  vendas: number | null
  incomplete: number
}

/** Gross trade amounts in BRL, at historical PTAX, never today's FX.
 * A missing currency/rate invalidates the month rather than understating its total.
 */
export function buildMonthlyAportes(
  transactions: Transaction[], assets: Map<string, AporteAsset>,
  filter: AssetType | 'all' = 'all', rates: DatedRate[] = [],
): MonthlyAportePoint[] {
  const months = new Map<string, MonthlyAportePoint>()
  for (const trade of transactions) {
    if (trade.type !== 'buy' && trade.type !== 'sell') continue
    const asset = assets.get(trade.ticker)
    if (filter !== 'all' && asset && asset.type !== filter) continue
    const month = trade.transaction_date.slice(0, 7)
    const point = months.get(month) ?? { month, compras: 0, vendas: 0, incomplete: 0 }
    const rate = asset?.currency === 'BRL' ? 1 : asset?.currency === 'USD' ? rateAt(rates, trade.transaction_date) : null
    const value = Number(trade.quantity) * Number(trade.price)
    if (rate === null || !Number.isFinite(value) || value < 0) {
      point.incomplete++
      point.compras = point.vendas = null
    } else if (!point.incomplete) {
      if (trade.type === 'buy') point.compras = (point.compras ?? 0) + value * rate
      else point.vendas = (point.vendas ?? 0) + value * rate
    }
    months.set(month, point)
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
}
