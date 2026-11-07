import { explainScore } from '../utils/scoreCalculation'
import { METRIC_LABELS, OPERATOR_LABELS, type ScoreRule, type FundamentalsRow } from '../types'

export function ScoreBreakdown({ rules, row }: { rules: ScoreRule[]; row: FundamentalsRow | null }) {
  const result = explainScore(rules, row)
  return <section aria-label="Composição do score" className="mt-4 space-y-3">
    {rules.length === 0 ? <p className="text-sm text-white/60">Selecione um score em Análise para ver os critérios.</p> : <>
      <p className="text-xs text-white/60">Soma dos critérios atendidos, limitada a 0–100. Dado ausente não soma pontos; não significa condição reprovada.</p>
      {result.criteria.map(({ rule, value, met, contribution }) => <div key={rule.id} className="rounded-xl border border-white/10 p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong className="text-white">{METRIC_LABELS[rule.metric]}</strong><span className="text-white/80">{contribution > 0 ? '+' : ''}{contribution} pontos</span></div>
        <p className="mt-1 text-white/65">Condição: {OPERATOR_LABELS[rule.operator]} {rule.threshold_min.toLocaleString('pt-BR')}{rule.operator === 'between' ? ` e ${rule.threshold_max?.toLocaleString('pt-BR')}` : ''} · Vale {rule.points} pontos</p>
        <p className="mt-1 text-white/65">Observado: {value === null ? 'Indisponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} · {met === null ? 'Sem dados' : met ? 'Atendido' : 'Não atendido'}</p>
      </div>)}
      <p className="text-sm text-white/80">Soma antes do limite: {row ? result.raw : 'Indisponível'} · Score final: {result.total ?? 'Indisponível'}</p>
      {row && <p className="text-xs text-white/50">Referência dos fundamentos: {row.reference_date.split('-').reverse().join('/')}</p>}
      {row?.source === 'yahoo' && rules.some(rule => rule.metric === 'debt_equity') && <p className="text-xs text-white/60">Dívida/PL é fornecida pelo Yahoo em percentual. As condições cadastradas são preservadas, sem converter seus limites automaticamente.</p>}
      {['seed','synthetic'].includes(row?.source ?? '') && <p role="status" className="text-xs text-amber-200">Estes fundamentos são demonstrativos e não devem orientar uma decisão de investimento.</p>}
    </>}
  </section>
}
