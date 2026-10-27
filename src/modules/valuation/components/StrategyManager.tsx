import { Fragment, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useStrategies, type ValuationStrategy, type StrategyInput } from '../hooks/useStrategies'
import { CustomRuleEditor } from './CustomRuleEditor'
import { CUSTOM_METRICS, validCustomRules } from '../utils/customStrategy'
import { STRATEGY_ASSET_LABELS, strategyAssetTypes } from '../utils/strategyAssetTypes'

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-[#393939] px-3 py-2.5 text-sm text-white'
const defaults: StrategyInput = { name: '', method: 'custom', min_dy: 0.06, safety_discount: 0, show_in_assets: true, custom_rules: [], rule_match: 'all' }

export function StrategyManager({ initialDraft }: { initialDraft?: StrategyInput } = {}) {
  const { strategies, isLoading, isError, save, remove } = useStrategies()
  const [deleting, setDeleting] = useState<ValuationStrategy | null>(null)
  const [editing, setEditing] = useState<ValuationStrategy | null | undefined>(initialDraft ? null : undefined)
  const [draft, setDraft] = useState(initialDraft ?? defaults)
  const [error, setError] = useState('')
  function open(strategy: ValuationStrategy | null) {
    setEditing(strategy)
    setDraft(strategy ?? defaults)
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await save.mutateAsync({ ...draft, ...(editing ? { id: editing.id } : {}) })
      setEditing(undefined)
    } catch { setError('Não foi possível salvar. Confira os campos e use um nome diferente das outras estratégias.') }
  }
  async function toggle(strategy: ValuationStrategy) {
    setError('')
    try { await save.mutateAsync({ ...strategy, show_in_assets: !strategy.show_in_assets }) }
    catch { setError('Não foi possível alterar a exibição. Tente novamente.') }
  }
  return (
    <section aria-label="Minhas estratégias" className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-5 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl"><h2 className="text-sm font-medium text-white">Minhas estratégias</h2><p className="mt-1 text-xs leading-relaxed text-white/45">Crie sua estratégia do zero com indicadores e condições, ou use Bazin e Graham. As estratégias escolhidas aparecem em Ativos › Posições e nos cards do app.</p></div>
        <button type="button" onClick={() => open(null)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-[#393939] px-4 py-2 text-xs text-white transition-colors hover:bg-[#484848]"><Plus className="h-3.5 w-3.5" />Nova estratégia</button>
      </div>
      {isLoading && <p className="text-sm text-gray-400">Carregando estratégias…</p>}
      {isError && <p role="alert" className="text-sm text-red-300">Não foi possível carregar suas estratégias.</p>}
      {!isLoading && !isError && strategies.length === 0 && <p className="text-sm text-gray-400">Você ainda não criou estratégias. Comece do zero, por exemplo combinando DY ≥ 6% e P/L ≤ 10.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((strategy) => <article key={strategy.id} className="flex min-w-0 flex-col rounded-xl border border-white/[0.09] bg-[#222222] px-4 pt-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-medium text-white">{strategy.name}</h3><p className="mt-1 text-[11px] leading-relaxed text-white/40">{strategy.method === 'custom' ? `Estratégia do zero · ${strategy.custom_rules?.length ?? 0} condições · ${strategy.rule_match === 'any' ? 'pelo menos uma deve ser atendida (OU)' : 'todas devem ser atendidas (E)'}` : `${strategy.method === 'fii' ? 'Preço-teto de FIIs' : strategy.method === 'bazin' ? 'Bazin' : 'Graham'} · desconto adicional ${(strategy.safety_discount * 100).toLocaleString('pt-BR')}%`}</p></div>
            <button type="button" aria-label={`Editar ${strategy.name}`} onClick={() => open(strategy)} className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label={`Excluir ${strategy.name}`} onClick={() => setDeleting(strategy)} className="rounded-md p-1.5 text-[#e477a7] hover:bg-[#e477a7]/10"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mb-4 mt-3 flex flex-wrap items-center gap-1.5">
            {strategy.method === 'fii' && <p className="w-full text-[10px] text-white/45">Inflação {(100 * (strategy.fii_inflation ?? 0)).toLocaleString('pt-BR')}% · IPCA+ {(100 * (strategy.fii_treasury ?? 0)).toLocaleString('pt-BR')}% · imposto {(100 * (strategy.fii_tax ?? 0)).toLocaleString('pt-BR')}% · prêmio {(100 * (strategy.fii_premium ?? 0)).toLocaleString('pt-BR')}%</p>}
            {strategy.method === 'custom' ? strategy.custom_rules?.map((rule, index) => <Fragment key={index}>
              {index > 0 && <span className="text-[10px] text-white/40">{strategy.rule_match === 'any' ? 'OU' : 'E'}</span>}
              <span className="rounded-md border border-[#797fff]/30 bg-[#797fff]/10 px-2 py-1 text-[10px] text-[#c2c5ff]">{CUSTOM_METRICS[rule.metric]} {rule.operator === 'between' ? `${rule.min} a ${rule.max}` : `${({ lt: '<', lte: '≤', gt: '>', gte: '≥' })[rule.operator]} ${rule.min}`}</span>
            </Fragment>) : <span className="rounded-md border border-[#797fff]/30 bg-[#797fff]/10 px-2 py-1 text-[10px] text-[#c2c5ff]">{strategy.method === 'bazin' ? `DY mínimo ${(strategy.min_dy * 100).toLocaleString('pt-BR')}%` : strategy.method === 'fii' ? 'IPCA+ líquido + prêmio de risco' : '√(22,5 × LPA × VPA)'}</span>}
          </div>
          <label className="mt-auto flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] py-3 text-[11px] text-white/60">
            <span>Exibir em Ativos › Posições</span>
            <input aria-label="Exibir em Ativos" type="checkbox" className="peer sr-only" checked={strategy.show_in_assets} disabled={save.isPending} onChange={() => void toggle(strategy)} />
            <span aria-hidden="true" className="relative h-[18px] w-8 shrink-0 rounded-full bg-[#555] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#347fcb] peer-checked:after:translate-x-[14px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#a0a7ff] peer-disabled:opacity-40" />
          </label>
        </article>)}
      </div>
      {error && editing === undefined && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Modal isOpen={Boolean(deleting)} title="Excluir estratégia" onClose={() => setDeleting(null)} dismissible={!remove?.isPending}>
        <p className="text-sm text-white/60">Excluir “{deleting?.name}”? Ela também deixará de aparecer em Ativos.</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={remove?.isPending} onClick={() => setDeleting(null)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white">Cancelar</button><button type="button" disabled={remove?.isPending} onClick={async () => {
          if (!deleting) return
          try { await remove.mutateAsync(deleting.id); setDeleting(null); setError('') }
          catch { setError('Não foi possível excluir a estratégia. Tente novamente.'); setDeleting(null) }
        }} className="rounded-full bg-[#e477a7]/20 px-4 py-2 text-sm text-[#f29fc3]">{remove?.isPending ? 'Excluindo…' : 'Excluir estratégia'}</button></div>
      </Modal>
      <Modal isOpen={editing !== undefined} title={editing ? 'Editar estratégia' : 'Nova estratégia'} onClose={() => setEditing(undefined)} dismissible={!save.isPending}>
        <form onSubmit={submit} className="space-y-4 text-sm text-gray-300">
          <label className="block">Nome da estratégia<input className={inputClass} autoFocus required maxLength={60} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="block">Método<select className={inputClass} value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value as StrategyInput['method'], asset_types: null, fii_inflation: draft.fii_inflation ?? 0.05, fii_treasury: draft.fii_treasury ?? 0.08, fii_tax: draft.fii_tax ?? 0.15, fii_premium: draft.fii_premium ?? 0.01 })}><option value="custom">Estratégia do zero</option><option value="bazin">Bazin</option><option value="graham">Graham</option><option value="fii">Preço-teto de FIIs</option></select></label>
          {draft.method === 'fii' && <>
            {([
              ['fii_inflation', 'Inflação anual estimada (%)'],
              ['fii_treasury', 'Taxa real do Tesouro IPCA+ (% a.a.)'],
              ['fii_tax', 'Imposto estimado sobre o rendimento (%)'],
              ['fii_premium', 'Prêmio de risco adicional (%)'],
            ] as const).map(([key, label]) => <label key={key} className="block">{label}<input className={inputClass} type="number" required min="0" max={key === 'fii_tax' ? '99' : '100'} step="any" value={draft[key] == null || !Number.isFinite(draft[key]) ? '' : Number((draft[key]! * 100).toFixed(4))} onChange={(event) => setDraft({ ...draft, [key]: event.target.valueAsNumber / 100 })} /></label>)}
            <p className="text-xs leading-relaxed text-white/45">A coluna calcula o teto com os proventos de 12 meses de cada FII. Outros tipos de ativo ficam sem referência. Estas taxas são premissas fixas, editáveis aqui; não acompanham o mercado automaticamente.</p>
          </>}
          {draft.method === 'custom' && <>
            <label className="block">Combinar condições<select className={inputClass} value={draft.rule_match ?? 'all'} onChange={(event) => setDraft({ ...draft, rule_match: event.target.value as 'all' | 'any' })}><option value="all">Todas devem ser atendidas (E)</option><option value="any">Pelo menos uma deve ser atendida (OU)</option></select></label>
            <CustomRuleEditor rules={draft.custom_rules ?? []} onChange={(custom_rules) => setDraft({ ...draft, custom_rules })} />
            <p className="text-xs text-gray-400">A coluna mostra “Atende”, “Não atende” ou “Dados insuficientes”. Você define os critérios; não é necessário usar Bazin ou Graham.</p>
          </>}
          {draft.method === 'bazin' && <label className="block">DY mínimo (%)<input className={inputClass} type="number" required min="0.1" max="100" step="any" value={Number.isFinite(draft.min_dy) ? Number((draft.min_dy * 100).toFixed(4)) : ''} onChange={(event) => setDraft({ ...draft, min_dy: event.target.valueAsNumber / 100 })} /></label>}
          {draft.method !== 'custom' && <><label className="block">Desconto adicional sobre a referência (%)<input className={inputClass} type="number" required min="0" max="99" step="0.1" value={Number.isFinite(draft.safety_discount) ? Number((draft.safety_discount * 100).toFixed(4)) : ''} onChange={(event) => setDraft({ ...draft, safety_discount: event.target.valueAsNumber / 100 })} /></label>
          <p className="text-xs text-gray-400">Exemplo: referência de R$ 100 com desconto de 20% resulta em R$ 80. O cálculo usa os dados disponíveis de cada ativo, respeitando a adequação do método.</p></>}
          <fieldset className="rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-xs text-white/60">Aplicar estratégia em</legend>
            <div className="grid grid-cols-2 gap-3">{strategyAssetTypes(draft.method).map((type) => {
              const selected = draft.asset_types ?? strategyAssetTypes(draft.method)
              return <label key={type} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.includes(type)} onChange={(event) => setDraft({ ...draft, asset_types: event.target.checked ? [...selected, type] : selected.filter((value) => value !== type) })} />{STRATEGY_ASSET_LABELS[type]}</label>
            })}</div>
            <p className="mt-3 text-[11px] text-white/40">Selecione pelo menos uma classe. Cada método mostra somente os tipos de ativo compatíveis.</p>
          </fieldset>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.show_in_assets} onChange={(event) => setDraft({ ...draft, show_in_assets: event.target.checked })} />Exibir esta estratégia em Ativos</label>
          {error && <p role="alert" className="text-red-300">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={save.isPending} onClick={() => setEditing(undefined)} className="rounded-lg border border-white/15 px-4 py-2">Cancelar</button><button type="submit" disabled={save.isPending || !draft.name.trim() || draft.asset_types?.length === 0 || (draft.method === 'custom' && !validCustomRules(draft.custom_rules ?? []))} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar estratégia'}</button></div>
        </form>
      </Modal>
    </section>
  )
}
