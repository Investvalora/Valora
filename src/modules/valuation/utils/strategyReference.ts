import type { PositionRow } from '../../portfolio/types'
import type { ValuationStrategy } from '../hooks/useStrategies'
import { calcBazinCeiling } from './bazinCalculation'
import { fiiCeiling } from './investmentSimulations'
import { strategyAppliesTo } from './strategyAssetTypes'

/** Entradas e saída na moeda da cotação; Bazin-base das posições usa DY de 6%. */
export function strategyReference(strategy: ValuationStrategy, row: PositionRow): number | null {
  if (!strategyAppliesTo(strategy, row.type)) return null
  if (strategy.method === 'custom') return null
  if (!Number.isFinite(strategy.safety_discount) || strategy.safety_discount < 0 || strategy.safety_discount >= 1) return null
  if (strategy.method === 'fii') {
    if (row.type !== 'fii') return null
    if ([strategy.fii_inflation, strategy.fii_treasury, strategy.fii_tax, strategy.fii_premium].some((value) => value == null)) return null
    try {
      const result = fiiCeiling((row.bazinCeiling ?? 0) * 0.06, strategy.fii_inflation!, strategy.fii_treasury!, strategy.fii_tax!, strategy.fii_premium!)
      return result.ceiling * (1 - strategy.safety_discount)
    } catch { return null }
  }
  const applicable = strategy.method === 'graham'
    ? ['stock_br', 'stock_us', 'bdr']
    : ['stock_br', 'stock_us', 'bdr', 'fii', 'reit', 'etf_br', 'etf_us']
  if (!row.type || !applicable.includes(row.type)) return null
  const base = strategy.method === 'graham'
    ? row.grahamPrice ?? null
    : calcBazinCeiling((row.bazinCeiling ?? 0) * 0.06, strategy.min_dy)
  if (base === null || !Number.isFinite(base) || base <= 0) return null
  return base * (1 - strategy.safety_discount)
}
