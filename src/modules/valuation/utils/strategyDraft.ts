import { z } from 'zod'
import { draftKey, removeDraft } from '../../../shared/utils/sessionDraft'
import type { StrategyInput, ValuationStrategy } from '../hooks/useStrategies'
import { CUSTOM_METRICS, CUSTOM_OPERATORS, type CustomStrategyRule } from './customStrategy'

const number = z.number().finite().nullable().transform(value => value ?? NaN)
const schema = z.object({
  name: z.string().max(60), method: z.enum(['bazin', 'graham', 'custom', 'fii']),
  min_dy: number, safety_discount: number, show_in_assets: z.boolean(),
  fii_inflation: z.number().finite().nullable().optional(), fii_treasury: z.number().finite().nullable().optional(),
  fii_tax: z.number().finite().nullable().optional(), fii_premium: z.number().finite().nullable().optional(),
  rule_match: z.enum(['all', 'any']).optional(),
  custom_rules: z.array(z.object({
    metric: z.custom<CustomStrategyRule['metric']>(value => typeof value === 'string' && Object.prototype.hasOwnProperty.call(CUSTOM_METRICS, value)),
    operator: z.custom<CustomStrategyRule['operator']>(value => typeof value === 'string' && Object.prototype.hasOwnProperty.call(CUSTOM_OPERATORS, value)),
    min: number, max: number.optional(),
  })).max(20).optional(),
  asset_types: z.array(z.enum(['stock_br','fii','bdr','stock_us','etf_us','etf_br','reit','crypto','fixed_income'])).max(9).nullable().optional(),
})
export function validateStrategyDraft(value: unknown): StrategyInput | null {
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : null
}
export function strategyDraftKey(userId: string | undefined, editing?: ValuationStrategy | null, initial?: StrategyInput) {
  return userId ? draftKey(userId, 'global', `strategy:${JSON.stringify(editing ?? initial ?? 'new')}`) : null
}
export function clearStrategyDraft(userId: string | undefined, editing?: ValuationStrategy | null, initial?: StrategyInput) {
  const key = strategyDraftKey(userId, editing, initial)
  if (key) removeDraft(key)
}
