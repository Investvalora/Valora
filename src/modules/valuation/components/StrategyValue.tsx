import type { ValuationStrategy } from '../hooks/useStrategies'
import type { PositionRow } from '../../portfolio/types'
import { strategyReference } from '../utils/strategyReference'
import { evaluateCustomStrategy } from '../utils/customStrategy'
import { fmtMoney } from '../../ativos/utils/fmt'
import { strategyAppliesTo } from '../utils/strategyAssetTypes'

export function StrategyValue({ strategy, row }: { strategy: ValuationStrategy; row: PositionRow }) {
  if (!strategyAppliesTo(strategy, row.type)) return <>—</>
  if (strategy.method !== 'custom') return <>{fmtMoney(strategyReference(strategy, row), row.currency ?? 'BRL')}</>
  const result = evaluateCustomStrategy(strategy.custom_rules ?? [], strategy.rule_match ?? 'all', row)
  return <span className={result === null ? 'text-white/40' : result ? 'text-nf-green' : 'text-nf-pink'}>{result === null ? 'Dados insuficientes' : result ? 'Atende' : 'Não atende'}</span>
}
