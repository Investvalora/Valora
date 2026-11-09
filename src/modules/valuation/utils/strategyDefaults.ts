import type { StrategyInput } from '../hooks/useStrategies'

export const STRATEGY_DEFAULTS: StrategyInput = {
  name: '', method: 'custom', min_dy: 0.06, safety_discount: 0,
  show_in_assets: true, custom_rules: [], rule_match: 'all',
}
