import type { AssetType } from '../../portfolio/types'
import type { ValuationStrategy } from '../hooks/useStrategies'

export const STRATEGY_ASSET_LABELS: Partial<Record<AssetType, string>> = {
  stock_br: 'Ações brasileiras', stock_us: 'Stocks', bdr: 'BDRs', fii: 'FIIs', reit: 'REITs', etf_br: 'ETFs brasileiros', etf_us: 'ETFs internacionais', crypto: 'Criptomoedas',
}
export function strategyAssetTypes(method: ValuationStrategy['method']): AssetType[] {
  if (method === 'fii') return ['fii']
  if (method === 'graham') return ['stock_br', 'stock_us', 'bdr']
  if (method === 'bazin') return ['stock_br', 'stock_us', 'bdr', 'fii', 'reit', 'etf_br', 'etf_us']
  return ['stock_br', 'stock_us', 'bdr', 'fii', 'reit', 'etf_br', 'etf_us', 'crypto']
}
export function strategyAppliesTo(strategy: ValuationStrategy, type: AssetType | null): boolean {
  return type !== null && strategyAssetTypes(strategy.method).includes(type) && (strategy.asset_types == null || strategy.asset_types.includes(type))
}
