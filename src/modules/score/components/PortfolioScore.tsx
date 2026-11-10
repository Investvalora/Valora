import { useWallets } from '../../portfolio/hooks/useWallets'
import { useAtivosValuation } from '../../ativos/hooks/useAtivosValuation'
import { useFundamentals } from '../hooks/useFundamentals'
import { applyScoreRules, getMetricValue, weightedPortfolioScore } from '../utils/scoreCalculation'
import type { ScoreRule } from '../types'

export function PortfolioScore({ rules }: { rules: ScoreRule[] }) {
  const { selectedWallet } = useWallets()
  const valuation = useAtivosValuation(selectedWallet?.id ?? '', true)
  const fundamentals = useFundamentals(valuation.tickers)
  // Only companies with all active criteria present enter this aggregate.
  const eligible = valuation.rows.filter(row => ['stock_br', 'stock_us', 'bdr'].includes(row.type ?? ''))
  const data = (fundamentals.data ?? []).filter(row => !['seed', 'synthetic'].includes(row.source ?? '') && eligible.some(position => position.ticker === row.ticker) && rules.every(rule => getMetricValue(row, rule.metric) !== null))
  const result = weightedPortfolioScore(valuation.compositionRows, applyScoreRules(rules, data))
  const loading = valuation.isLoading || fundamentals.isLoading
  const error = valuation.isError || fundamentals.isError
  const score = rules.length && !loading && !error ? result.score : null
  return <section aria-label="Score da carteira" className="rounded-[14px] border border-white/10 bg-[#1B1B1B] p-5">
    <h3 className="font-semibold text-white">Score médio ponderado · {selectedWallet?.name ?? 'Carteira'}</h3>
    <p className="mt-2 text-2xl font-semibold text-white">{loading ? 'Carregando…' : score === null ? 'Indisponível' : `${score.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} / 100`}</p>
    {error && <p role="alert" className="mt-2 text-sm text-amber-200">Não foi possível carregar os dados da carteira.</p>}
    <p className="mt-2 text-sm text-white/60">{rules.length === 0 ? 'Selecione um score abaixo.' : `Cobertura do patrimônio: ${!loading && !error && result.coverage !== null ? `${result.coverage.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : 'indisponível'}.`}</p>
    <p className="mt-2 text-xs leading-relaxed text-white/60">Média dos scores de ações e BDRs com todos os critérios disponíveis, ponderada pelo valor de mercado em reais. Ativos sem dados completos, fundos, ETFs, cripto e renda fixa ficam fora da média e continuam no total usado para medir a cobertura. Usa a carteira inteira, sem os filtros de Ativos.</p>
  </section>
}
