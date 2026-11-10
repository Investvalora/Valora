import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { Modal } from '../../../shared/components/Modal'
import { METRIC_LABELS, type ScoreMetric } from '../../score/types'
import {
  configuredAlertsService as service,
  type ConfiguredAlertRule,
  type RuleInput,
  type RuleKind,
} from '../services/configuredAlertsService'
import { useAlertPriceFields } from '../hooks/useAlertPriceFields'
import { AlertAssetField } from './AlertPriceFields'
import { supportsIndicator } from '../../../shared/indicators/catalog'
import { z } from 'zod'
import { useFormDraft } from '../../../shared/hooks/useFormDraft'
import { draftKey } from '../../../shared/utils/sessionDraft'
import { FormDraftNotice } from '../../../shared/components/FormDraftNotice'
import { DebtThresholdNotice } from '../../score/components/DebtThresholdNotice'
import { Plus, Pencil, Pause, Play, Trash2 } from 'lucide-react'

// ─── Constantes de tipo ───────────────────────────────────────────────────────

const kinds: Record<RuleKind, string> = {
  indicator:          'Indicador fundamentalista',
  dividend_announced: 'Provento anunciado',
  dividend_payment:   'Data de pagamento de provento',
}

// ─── Estilos internos ─────────────────────────────────────────────────────────

const fieldClass =
  'mt-1.5 min-h-10 w-full rounded-xl border border-white/[0.1] bg-[#1E1E1E] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-nf-blue/40'

const ruleDraftSchema = z.object({
  ticker:    z.string().max(40),
  kind:      z.enum(['indicator', 'dividend_announced', 'dividend_payment']),
  metric:    z
    .string()
    .refine((v) => Object.prototype.hasOwnProperty.call(METRIC_LABELS, v))
    .transform((v) => v as ScoreMetric),
  operator:  z.enum(['gte', 'lte']),
  threshold: z.string().max(100),
})

const validateRuleDraft = (value: unknown) => {
  const result = ruleDraftSchema.safeParse(value)
  return result.success ? result.data : null
}

// ─── Formulário de criação/edição de regra ────────────────────────────────────

function RuleForm({
  rule,
  userId,
  onClose,
  onSaved,
}: {
  rule?: ConfiguredAlertRule
  userId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [ticker, setTicker]       = useState(rule?.ticker ?? '')
  const [unusedPrice, setUnusedPrice] = useState('')
  const [kind, setKind]           = useState<RuleKind>(rule?.kind ?? 'indicator')
  const [metric, setMetric]       = useState<ScoreMetric>(rule?.metric ?? 'dy')
  const [operator, setOperator]   = useState<'gte' | 'lte'>(rule?.operator ?? 'gte')
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? ''))
  const [invalid, setInvalid]     = useState('')

  const value   = { ticker, kind, metric, operator, threshold }
  const initial = {
    ticker:    rule?.ticker ?? '',
    kind:      rule?.kind ?? 'indicator',
    metric:    rule?.metric ?? 'dy',
    operator:  rule?.operator ?? 'gte',
    threshold: String(rule?.threshold ?? ''),
  }

  const draft = useFormDraft(
    draftKey(userId, 'global', `alert-rule:${rule ? JSON.stringify(rule) : 'new'}`),
    value,
    JSON.stringify(value) !== JSON.stringify(initial),
    validateRuleDraft,
  )
  const [hasDraftOnOpen] = useState(draft.available)
  const model = useAlertPriceFields({
    ticker,
    price: unusedPrice,
    onTickerChange: setTicker,
    onPriceChange: setUnusedPrice,
    initialTicker: hasDraftOnOpen ? '' : rule?.ticker,
    fetchQuote: false,
  })
  const [restored, setRestored] = useState(false)

  function close() { draft.clear(); onClose() }
  function restore() {
    const saved = draft.restore()
    if (!saved) return
    model.changeTicker(saved.ticker)
    setKind(saved.kind)
    setMetric(saved.metric)
    setOperator(saved.operator)
    setThreshold(saved.threshold)
    setRestored(true)
  }

  const fund = ['fii', 'reit'].includes(model.selected?.type ?? '')
  const chosenMetric =
    fund && model.selected && !supportsIndicator(metric, model.selected.type) ? 'dy' : metric

  const save = useMutation({
    mutationFn: (input: RuleInput) => service.save(userId, input, rule?.id),
    onSuccess: () => { draft.clear(); onSaved() },
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setInvalid('')
    if (!model.selected || model.selected.ticker !== ticker.toUpperCase()) {
      setInvalid('Selecione um ativo no autocomplete.')
      return
    }
    if (kind === 'indicator' && !['stock_br', 'stock_us', 'bdr', 'fii', 'reit'].includes(model.selected.type)) {
      setInvalid('Essa classe não possui indicadores compatíveis.')
      return
    }
    if (kind !== 'indicator' && !['stock_br', 'stock_us', 'bdr', 'fii', 'reit', 'etf_br', 'etf_us'].includes(model.selected.type)) {
      setInvalid('Essa classe não possui proventos compatíveis.')
      return
    }
    const numValue = threshold.trim() ? Number(threshold.replace(',', '.')) : NaN
    if (kind === 'indicator' && !Number.isFinite(numValue)) {
      setInvalid('Informe um valor de referência válido.')
      return
    }
    save.mutate({
      ticker:    model.selected.ticker,
      kind,
      metric:    kind === 'indicator' ? chosenMetric : null,
      operator:  kind === 'indicator' ? operator : null,
      threshold: kind === 'indicator' ? numValue : null,
    })
  }

  return (
    <Modal
      isOpen
      title={rule ? 'Editar regra de alerta' : 'Nova regra de alerta'}
      onClose={close}
      dismissible={!save.isPending}
      variant="score"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormDraftNotice {...draft} onRestore={restore} onDiscard={draft.clear} />

        {restored && !model.selected && (
          <p role="status" className="text-[12px] text-white/60">
            Selecione novamente o ativo na busca para validar a classe antes de salvar. A condição do rascunho foi preservada.
          </p>
        )}

        <AlertAssetField model={model} />

        {/* Tipo de acompanhamento */}
        <label className="block text-[12px] text-white/60">
          Tipo de acompanhamento
          <select
            className={fieldClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as RuleKind)}
          >
            {Object.entries(kinds).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        {/* campos exclusivos de indicador */}
        {kind === 'indicator' && (
          <>
            <label className="block text-[12px] text-white/60">
              Indicador
              <select
                className={fieldClass}
                value={chosenMetric}
                onChange={(e) => setMetric(e.target.value as ScoreMetric)}
              >
                {Object.entries(METRIC_LABELS)
                  .filter(([key]) => !fund || (model.selected && supportsIndicator(key as ScoreMetric, model.selected.type)))
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {key === 'debt_equity' ? 'Dívida/PL (%) — Yahoo' : label}
                    </option>
                  ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[12px] text-white/60">
                Condição
                <select
                  className={fieldClass}
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as 'gte' | 'lte')}
                >
                  <option value="gte">Maior ou igual (≥)</option>
                  <option value="lte">Menor ou igual (≤)</option>
                </select>
              </label>
              <label className="text-[12px] text-white/60">
                Valor de referência
                <input
                  className={fieldClass}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
            </div>
          </>
        )}

        {kind === 'indicator' && chosenMetric === 'debt_equity' && (
          <p className="text-[11px] text-white/50">
            Dívida/PL em percentual, conforme Yahoo: 76 significa 76%, e não 76 vezes o patrimônio.
          </p>
        )}
        {kind === 'indicator' && chosenMetric === 'debt_equity' && threshold.trim() && (
          <DebtThresholdNotice minimum={Number(threshold.replace(',', '.'))} />
        )}

        <p className="text-[11px] leading-relaxed text-white/40">
          Indicadores: ações e BDRs; fundos aceitam DY e P/VP. Cada condição dispara uma vez ao ser atendida e rearma depois de deixar de ser atendida. Proventos: somente eventos públicos disponíveis na fonte, uma notificação por evento. O aviso não confirma direito ao recebimento.
        </p>

        {(invalid || save.isError) && (
          <p role="alert" className="text-[12px] text-amber-300">
            {invalid || 'Não foi possível salvar. Confira a classe do ativo, a condição e se já existe uma regra igual.'}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={save.isPending}
            onClick={close}
            className="rounded-lg border border-white/[0.1] px-4 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg border border-nf-blue/30 bg-nf-blue/10 px-4 py-2 text-[13px] font-medium text-nf-blue transition-colors hover:bg-nf-blue/15 disabled:opacity-50"
          >
            {save.isPending ? 'Salvando…' : 'Salvar regra'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Linha de regra ─ 

function RuleRow({
  rule,
  onEdit,
  onToggle,
  onDelete,
  isPending,
}: {
  rule: ConfiguredAlertRule
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const conditionLabel =
    rule.kind === 'indicator' && rule.metric
      ? `${METRIC_LABELS[rule.metric] ?? rule.metric} ${rule.operator === 'gte' ? '≥' : '≤'} ${rule.threshold?.toLocaleString('pt-BR')}`
      : kinds[rule.kind]

  return (
    <li className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-b-0">
      {/* status dot */}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${rule.enabled ? 'bg-nf-green' : 'bg-white/20'}`}
        aria-hidden="true"
      />

      {/* conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            {rule.ticker}
          </span>
          <span className="truncate text-[13px] font-medium text-white/80">
            {conditionLabel}
          </span>
        </div>
        {rule.kind === 'indicator' && rule.metric === 'debt_equity' && rule.threshold != null && (
          <div className="mt-1">
            <DebtThresholdNotice minimum={rule.threshold} />
          </div>
        )}
        <span className={`mt-0.5 block text-[10px] ${rule.enabled ? 'text-nf-green' : 'text-white/30'}`}>
          {rule.enabled ? 'Ativa' : 'Pausada'}
        </span>
      </div>

      {/* ações */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar regra de ${rule.ticker}`}
          className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/40"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          aria-label={rule.enabled ? `Pausar regra de ${rule.ticker}` : `Ativar regra de ${rule.ticker}`}
          className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/40 disabled:opacity-40"
        >
          {rule.enabled
            ? <Pause className="h-3 w-3" aria-hidden="true" />
            : <Play  className="h-3 w-3" aria-hidden="true" />}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          aria-label={`Excluir regra de ${rule.ticker}`}
          className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.08] hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/40 disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

// ─── ConfiguredAlerts ──── 

export function ConfiguredAlerts() {
  const { user } = useAuth()
  const client   = useQueryClient()
  const key      = ['configured-alert-rules', user?.id]

  const query = useQuery({
    queryKey: key,
    queryFn: () => service.list(user!.id),
    enabled: !!user?.id,
  })

  const [editing, setEditing] = useState<ConfiguredAlertRule | 'new' | null>(null)

  function refresh() {
    void client.invalidateQueries({ queryKey: key })
    setEditing(null)
  }

  const action = useMutation({
    mutationFn: ({ rule, remove }: { rule: ConfiguredAlertRule; remove?: boolean }) =>
      remove
        ? service.remove(user!.id, rule.id)
        : service.setEnabled(user!.id, rule.id, !rule.enabled),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })

  function handleDelete(rule: ConfiguredAlertRule) {
    if (window.confirm(`Excluir a regra de ${rule.ticker}? Os avisos já recebidos serão mantidos.`)) {
      action.mutate({ rule, remove: true })
    }
  }

  return (
    <section aria-label="Regras de alertas">
      {/* caaabeçalho da seção */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>

          <p className="mt-0.5 text-[11px] text-white/40">
            Monitoramento automático a cada 5 minutos, inclusive com o app fechado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex shrink-0 items-center gap-1.5 rounded-lg  bg-nf-blue/20 px-3 py-1.5 text-[12px] font-medium text-nf-blue transition-colors hover:bg-nf-blue/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/50"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          Nova regra
        </button>
      </div>

      {query.isLoading ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-b-0">
              <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-[12px] text-amber-300">
          Não foi possível carregar as regras.{' '}
          <button onClick={() => query.refetch()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : !query.data?.length ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center">
          <p className="text-[13px] text-white/40">Nenhuma regra configurada.</p>
          <p className="mt-0.5 text-[11px] text-white/25">
            Crie uma regra para receber alertas automáticos por indicador ou provento.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
          {query.data.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onEdit={() => setEditing(rule)}
              onToggle={() => action.mutate({ rule })}
              onDelete={() => handleDelete(rule)}
              isPending={action.isPending}
            />
          ))}
        </ul>
      )}

      {action.isError && (
        <p role="alert" className="mt-2 text-[11px] text-amber-300">
          Não foi possível alterar a regra. Tente novamente.
        </p>
      )}

      {/* modal de criação/edição */}
      {editing && user && (
        <RuleForm
          key={`${user.id}:${JSON.stringify(editing)}`}
          rule={editing === 'new' ? undefined : editing}
          userId={user.id}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </section>
  )
}
