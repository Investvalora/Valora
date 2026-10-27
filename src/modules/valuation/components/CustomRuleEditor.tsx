import { CUSTOM_METRICS, CUSTOM_OPERATORS, type CustomStrategyRule } from '../utils/customStrategy'

const field = 'mt-1 w-full rounded-lg border border-white/15 bg-[#393939] px-3 py-2 text-sm text-white'
export function CustomRuleEditor({ rules, onChange }: { rules: CustomStrategyRule[]; onChange: (rules: CustomStrategyRule[]) => void }) {
  function update(index: number, patch: Partial<CustomStrategyRule>) {
    onChange(rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule))
  }
  return <div className="space-y-3">
    {rules.map((rule, index) => <fieldset key={index} className="rounded-lg border border-white/10 p-3 space-y-2">
      <legend className="px-1 text-xs text-white/60">Condição {index + 1}</legend>
      <label className="block">Indicador<select className={field} value={rule.metric} onChange={(event) => update(index, { metric: event.target.value as CustomStrategyRule['metric'] })}>{Object.entries(CUSTOM_METRICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block">Comparação<select className={field} value={rule.operator} onChange={(event) => update(index, { operator: event.target.value as CustomStrategyRule['operator'] })}>{Object.entries(CUSTOM_OPERATORS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block">{rule.operator === 'between' ? 'Valor mínimo' : 'Valor de referência'}<input className={field} type="number" step="any" required value={Number.isFinite(rule.min) ? rule.min : ''} onChange={(event) => update(index, { min: event.target.valueAsNumber })} /></label>
      {rule.operator === 'between' && <label className="block">Valor máximo<input className={field} type="number" step="any" required min={Number.isFinite(rule.min) ? rule.min : undefined} value={Number.isFinite(rule.max) ? rule.max : ''} onChange={(event) => update(index, { max: event.target.valueAsNumber })} /></label>}
      <button type="button" aria-label={`Remover condição ${index + 1}`} onClick={() => onChange(rules.filter((_, i) => i !== index))} className="text-xs text-red-300">Remover condição</button>
    </fieldset>)}
    <button type="button" disabled={rules.length >= 20} onClick={() => onChange([...rules, { metric: 'pl', operator: 'lte', min: 0 }])} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white disabled:opacity-50">Adicionar condição</button>
    <p className="text-xs text-gray-400">Use percentuais em pontos: para DY de 6%, digite 6. Preço atual usa a moeda de cada ativo. Até 20 condições; dados ausentes geram “Dados insuficientes” quando impedem a avaliação.</p>
  </div>
}
