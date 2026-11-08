import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { Modal } from '../../../shared/components/Modal'
import { METRIC_LABELS, type ScoreMetric } from '../../score/types'
import { configuredAlertsService as service, type ConfiguredAlertRule, type RuleInput, type RuleKind } from '../services/configuredAlertsService'
import { useAlertPriceFields } from '../hooks/useAlertPriceFields'
import { AlertAssetField } from './AlertPriceFields'
import { supportsIndicator } from '../../../shared/indicators/catalog'
import { z } from 'zod'
import { useFormDraft } from '../../../shared/hooks/useFormDraft'
import { draftKey } from '../../../shared/utils/sessionDraft'
import { FormDraftNotice } from '../../../shared/components/FormDraftNotice'
import { DebtThresholdNotice } from '../../score/components/DebtThresholdNotice'

const kinds: Record<RuleKind, string> = { indicator: 'Indicador fundamentalista', dividend_announced: 'Provento anunciado', dividend_payment: 'Data de pagamento de provento' }
const field = 'mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#252525] px-3 py-2 text-sm text-white'
const button = 'min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50'
const ruleDraftSchema = z.object({ ticker: z.string().max(40), kind: z.enum(['indicator', 'dividend_announced', 'dividend_payment']), metric: z.string().refine(value => Object.prototype.hasOwnProperty.call(METRIC_LABELS, value)).transform(value => value as ScoreMetric), operator: z.enum(['gte', 'lte']), threshold: z.string().max(100) })
const validateRuleDraft = (value: unknown) => { const result = ruleDraftSchema.safeParse(value); return result.success ? result.data : null }

function RuleForm({ rule, userId, onClose, onSaved }: { rule?: ConfiguredAlertRule; userId: string; onClose: () => void; onSaved: () => void }) {
  const [ticker, setTicker] = useState(rule?.ticker ?? '')
  const [unusedPrice, setUnusedPrice] = useState('')
  const [kind, setKind] = useState<RuleKind>(rule?.kind ?? 'indicator')
  const [metric, setMetric] = useState<ScoreMetric>(rule?.metric ?? 'dy')
  const [operator, setOperator] = useState<'gte' | 'lte'>(rule?.operator ?? 'gte')
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? ''))
  const value = { ticker, kind, metric, operator, threshold }
  const initial = { ticker: rule?.ticker ?? '', kind: rule?.kind ?? 'indicator', metric: rule?.metric ?? 'dy', operator: rule?.operator ?? 'gte', threshold: String(rule?.threshold ?? '') }
  const draft = useFormDraft(draftKey(userId, 'global', `alert-rule:${rule ? JSON.stringify(rule) : 'new'}`), value, JSON.stringify(value) !== JSON.stringify(initial), validateRuleDraft)
  const [hasDraftOnOpen] = useState(draft.available)
  const model = useAlertPriceFields({ ticker, price: unusedPrice, onTickerChange: setTicker, onPriceChange: setUnusedPrice, initialTicker: hasDraftOnOpen ? '' : rule?.ticker, fetchQuote: false })
  const [restored, setRestored] = useState(false)
  function close() { draft.clear(); onClose() }
  function restore() {
    const saved = draft.restore()
    if (!saved) return
    model.changeTicker(saved.ticker); setKind(saved.kind); setMetric(saved.metric); setOperator(saved.operator); setThreshold(saved.threshold); setRestored(true)
  }
  const fund = ['fii', 'reit'].includes(model.selected?.type ?? '')
  const chosenMetric = fund && model.selected && !supportsIndicator(metric, model.selected.type) ? 'dy' : metric
  const [invalid, setInvalid] = useState('')
  const save = useMutation({ mutationFn: (input: RuleInput) => service.save(userId, input, rule?.id), onSuccess: () => { draft.clear(); onSaved() } })
  return <Modal isOpen title={rule ? 'Editar regra de alerta' : 'Nova regra de alerta'} onClose={close} dismissible={!save.isPending} variant="score">
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault(); setInvalid('')
      if (!model.selected || model.selected.ticker !== ticker.toUpperCase()) { setInvalid('Selecione um ativo no autocomplete.'); return }
      if (kind === 'indicator' && !['stock_br','stock_us','bdr','fii','reit'].includes(model.selected.type)) { setInvalid('Essa classe não possui indicadores compatíveis.'); return }
      if (kind !== 'indicator' && !['stock_br','stock_us','bdr','fii','reit','etf_br','etf_us'].includes(model.selected.type)) { setInvalid('Essa classe não possui proventos compatíveis.'); return }
      const value = threshold.trim() ? Number(threshold.replace(',', '.')) : NaN
      if (kind === 'indicator' && !Number.isFinite(value)) { setInvalid('Informe um valor de referência válido.'); return }
      save.mutate({ ticker: model.selected.ticker, kind, metric: kind === 'indicator' ? chosenMetric : null, operator: kind === 'indicator' ? operator : null, threshold: kind === 'indicator' ? value : null })
    }}>
      <FormDraftNotice {...draft} onRestore={restore} onDiscard={draft.clear} />
      {restored && !model.selected && <p role="status" className="text-sm text-white/70">Selecione novamente o ativo na busca para validar a classe antes de salvar. A condição do rascunho foi preservada.</p>}
      <AlertAssetField model={model} />
      <label className="block text-sm text-white/70">Tipo de acompanhamento<select className={field} value={kind} onChange={event => setKind(event.target.value as RuleKind)}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {kind === 'indicator' && <>
        <label className="block text-sm text-white/70">Indicador<select className={field} value={chosenMetric} onChange={event => setMetric(event.target.value as ScoreMetric)}>{Object.entries(METRIC_LABELS).filter(([key]) => !fund || (model.selected && supportsIndicator(key as ScoreMetric, model.selected.type))).map(([key, label]) => <option key={key} value={key}>{key === 'debt_equity' ? 'Dívida/PL (%) — Yahoo' : label}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-white/70">Condição<select className={field} value={operator} onChange={event => setOperator(event.target.value as 'gte' | 'lte')}><option value="gte">Maior ou igual (≥)</option><option value="lte">Menor ou igual (≤)</option></select></label>
          <label className="text-sm text-white/70">Valor de referência<input className={field} value={threshold} onChange={event => setThreshold(event.target.value)} inputMode="decimal" required /></label></div>
      </>}
      {kind === 'indicator' && chosenMetric === 'debt_equity' && <p className="text-xs text-white/60">Dívida/PL em percentual, conforme Yahoo: 76 significa 76%, e não 76 vezes o patrimônio.</p>}
      {kind === 'indicator' && chosenMetric === 'debt_equity' && threshold.trim() && <DebtThresholdNotice minimum={Number(threshold.replace(',', '.'))} />}
      <p className="text-xs leading-relaxed text-white/60">Indicadores: ações e BDRs; fundos aceitam DY e P/VP. Cada condição dispara uma vez ao ser atendida e rearma depois de deixar de ser atendida. Proventos: somente eventos públicos disponíveis na fonte, uma notificação por evento. O aviso não confirma direito ao recebimento.</p>
      {(invalid || save.isError) && <p role="alert" className="text-sm text-amber-200">{invalid || 'Não foi possível salvar. Confira a classe do ativo, a condição e se já existe uma regra igual.'}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={save.isPending} onClick={close}>Cancelar</button><button className={button} disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar regra'}</button></div>
    </form>
  </Modal>
}

export function ConfiguredAlerts() {
  const { user } = useAuth()
  const client = useQueryClient()
  const key = ['configured-alert-rules', user?.id]
  const query = useQuery({ queryKey: key, queryFn: () => service.list(user!.id), enabled: !!user?.id })
  const [editing, setEditing] = useState<ConfiguredAlertRule | 'new' | null>(null)
  const refresh = () => { void client.invalidateQueries({ queryKey: key }); setEditing(null) }
  const action = useMutation({ mutationFn: ({ rule, remove }: { rule: ConfiguredAlertRule; remove?: boolean }) => remove ? service.remove(user!.id, rule.id) : service.setEnabled(user!.id, rule.id, !rule.enabled), onSuccess: () => client.invalidateQueries({ queryKey: key }) })
  return <section aria-label="Regras de alertas" className="mb-6 rounded-[14px] border border-white/10 bg-[#1B1B1B] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-white">Regras de indicadores e proventos</h2><button className={button} onClick={() => setEditing('new')}>Nova regra de alerta</button></div>
    <p className="mt-2 text-xs text-white/60">Monitoramento automático a cada 5 minutos, inclusive com o app fechado. Depende da atualização dos dados públicos; o push requer permissão no dispositivo.</p>
    {query.isLoading ? <p role="status" className="mt-3 text-sm text-white/60">Carregando regras…</p> : query.isError ? <div role="alert" className="mt-3 text-sm text-amber-200">Não foi possível carregar as regras. <button onClick={() => query.refetch()} className="underline">Tentar novamente</button></div> : !query.data?.length ? <p className="mt-3 text-sm text-white/50">Nenhuma regra configurada.</p> : <ul className="mt-4 space-y-3">{query.data.map(rule => <li key={rule.id} className="rounded-xl border border-white/10 p-3">
      <p className="text-sm font-semibold text-white">{rule.ticker} · {kinds[rule.kind]} · {rule.enabled ? 'Ativa' : 'Pausada'}</p>
      {rule.kind === 'indicator' && rule.metric === 'debt_equity' && rule.threshold != null && <DebtThresholdNotice minimum={rule.threshold} />}
      {rule.kind === 'indicator' && <p className="mt-1 text-sm text-white/65">{METRIC_LABELS[rule.metric!]} {rule.operator === 'gte' ? '≥' : '≤'} {rule.threshold?.toLocaleString('pt-BR')}</p>}
      <div className="mt-2 flex flex-wrap gap-2"><button className={button} onClick={() => setEditing(rule)}>Editar regra</button><button className={button} disabled={action.isPending} onClick={() => action.mutate({ rule })}>{rule.enabled ? 'Pausar' : 'Ativar'}</button><button className={button} disabled={action.isPending} onClick={() => { if (window.confirm(`Excluir a regra de ${rule.ticker}? Os avisos já recebidos serão mantidos.`)) action.mutate({ rule, remove: true }) }}>Excluir regra</button></div>
    </li>)}</ul>}
    {action.isError && <p role="alert" className="mt-3 text-sm text-amber-200">Não foi possível alterar a regra. Tente novamente.</p>}
    {editing && user && <RuleForm key={`${user.id}:${JSON.stringify(editing)}`} rule={editing === 'new' ? undefined : editing} userId={user.id} onClose={() => setEditing(null)} onSaved={refresh} />}
  </section>
}
