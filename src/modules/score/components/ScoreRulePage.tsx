/**
 * ScoreRulePage
 * - Criação (/analise/score/nova): página dedicada com layout desktop dois painéis + mobile scroll
 * - Edição (/analise/score/:id/editar): modal sobre AnaliseScore (comportamento original mantido)
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ScoreMetricHelp } from './ScoreMetricHelp'
import { DebtThresholdNotice } from './DebtThresholdNotice'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { scoreRuleSchema, type ScoreRuleFormValues } from '../utils/scoreValidation'
import {
  useScoreRules,
  useCreateScoreRule,
  useUpdateScoreRule,
  groupRulesByName,
} from '../hooks/useScoreRules'
import { METRIC_LABELS, OPERATOR_LABELS } from '../types'
import type { ScoreMetric, ScoreOperator, ScoreRule } from '../types'
import { ScorePreviewPanel } from './ScorePreviewPanel'
import { Modal } from '../../../shared/components/Modal'
import { AnaliseScore } from '../../analise/components/AnaliseScore'
import { AnaliseVisaoGeral } from '../../analise/components/AnaliseVisaoGeral'
import { useAuthStore } from '../../auth/store'
import { useFormDraft } from '../../../shared/hooks/useFormDraft'
import { draftKey } from '../../../shared/utils/sessionDraft'
import { FormDraftNotice } from '../../../shared/components/FormDraftNotice'
import { validateScoreDraft, type ScoreDraft } from '../utils/scoreDraft'

// ── Tokens de estilo ──────────────────────────────────────────────────────
const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-white/15 bg-[#242424] px-3 text-sm text-white outline-none transition-colors focus:border-nf-blue focus:ring-1 focus:ring-nf-blue/30'
const LABEL_CLASS = 'mb-2 block text-sm font-medium text-white/85'
const ERROR_CLASS = 'mt-1 text-xs text-rose-300'

// ── Hook compartilhado de lógica de formulário ────────────────────────────
function useScoreRuleForm(id?: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = Boolean(id)
  const returnTo = location.state?.returnTo === '/analise/visao-geral'
    ? '/analise/visao-geral'
    : '/analise/score'

  const { data: rules = [], isLoading: rulesLoading } = useScoreRules()
  const createRule = useCreateScoreRule()
  const updateRule = useUpdateScoreRule()

  const editingRule: ScoreRule | undefined = id ? rules.find((r) => r.id === id) : undefined

  const [scoreMode, setScoreMode] = useState<'existing' | 'new'>('existing')
  const scoreGroups = groupRulesByName(rules)
  const scoreNames = Array.from(scoreGroups.keys())

  useEffect(() => {
    if (!rulesLoading && !isEditing && scoreNames.length === 0) setScoreMode('new')
  }, [rulesLoading, isEditing, scoreNames.length])

  const [globalError, setGlobalError] = useState('')
  const isSaving = createRule.isPending || updateRule.isPending

  const form = useForm<ScoreRuleFormValues>({
    resolver: zodResolver(scoreRuleSchema),
    defaultValues: { operator: 'gte', metric: 'dy', name: '' },
  })

  const { reset, setValue, watch } = form

  useEffect(() => {
    if (editingRule) {
      reset({
        name: editingRule.name,
        metric: editingRule.metric,
        operator: editingRule.operator,
        threshold_min: editingRule.threshold_min,
        threshold_max: editingRule.threshold_max ?? undefined,
        points: editingRule.points,
      })
      setScoreMode(scoreNames.includes(editingRule.name) ? 'existing' : 'new')
    }
  }, [editingRule]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedName     = watch('name') ?? ''
  const watchedMetric   = watch('metric') ?? ''
  const watchedOperator = watch('operator') ?? ''
  const watchedMin      = watch('threshold_min')
  const watchedMax      = watch('threshold_max')
  const watchedPoints   = watch('points')
  const isBetween       = watchedOperator === 'between'
  const userId = useAuthStore(state => state.user?.id)
  const finite = (value: number | null | undefined) => Number.isFinite(value) ? value! : null
  const draftValue: ScoreDraft = {
    scoreMode, name: watchedName, metric: watchedMetric, operator: watchedOperator,
    threshold_min: finite(watchedMin), threshold_max: finite(watchedMax), points: finite(watchedPoints),
  }
  const draft = useFormDraft(userId ? draftKey(userId, 'global', `score-rule:${editingRule ? JSON.stringify(editingRule) : id ?? 'new'}`) : null,
    // Empty number inputs can make isDirty true during registration; only edited fields may replace a saved draft.
    draftValue, Object.keys(form.formState.dirtyFields).length > 0, validateScoreDraft)
  function restoreDraft() {
    const saved = draft.restore()
    if (!saved) return
    setScoreMode(saved.scoreMode)
    setValue('name', saved.name, { shouldDirty: true })
    setValue('metric', saved.metric, { shouldDirty: true })
    setValue('operator', saved.operator, { shouldDirty: true })
    setValue('threshold_min', saved.threshold_min ?? NaN, { shouldDirty: true })
    setValue('threshold_max', saved.threshold_max ?? undefined, { shouldDirty: true })
    setValue('points', saved.points ?? NaN, { shouldDirty: true })
  }
  function cancel() { draft.clear(); navigate(returnTo) }

  const existingRulesInScore: ScoreRule[] = watchedName
    ? (scoreGroups.get(watchedName) ?? []).filter((r) => r.id !== id)
    : []

  const buildPayload = (values: ScoreRuleFormValues) => ({
    ...values,
    threshold_max: isBetween ? (values.threshold_max ?? null) : null,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError('')
    try {
      if (isEditing && id) {
        await updateRule.mutateAsync({ id, payload: buildPayload(values) })
      } else {
        await createRule.mutateAsync(buildPayload(values))
      }
      draft.clear()
      navigate(returnTo)
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  const onSubmitAndAddAnother = form.handleSubmit(async (values) => {
    setGlobalError('')
    try {
      await createRule.mutateAsync(buildPayload(values))
      draft.clear()
      reset({ operator: 'gte', metric: 'dy', name: '' })
      setScoreMode(scoreNames.length > 0 ? 'existing' : 'new')
      setGlobalError('')
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  return {
    form, isEditing, rulesLoading, editingRule,
    scoreMode, setScoreMode, scoreNames, scoreGroups,
    globalError, isSaving,
    watchedName, watchedMetric, watchedOperator, watchedMin, watchedMax, watchedPoints,
    isBetween, existingRulesInScore,
    onSubmit, onSubmitAndAddAnother,
    navigate, returnTo, setValue, draft, restoreDraft, cancel,
  }
}

// ── Campos do formulário (reutilizados em criação e edição) ───────────────
function ScoreRuleFields({
  form, scoreMode, setScoreMode, scoreNames,
  isBetween, globalError, isSaving, isEditing,
  onSubmit, onSubmitAndAddAnother, onCancel,
  setValue, watchedName,
  showCreateAndAddAnother = true,
}: {
  form: ReturnType<typeof useScoreRuleForm>['form']
  scoreMode: 'existing' | 'new'
  setScoreMode: (m: 'existing' | 'new') => void
  scoreNames: string[]
  isBetween: boolean
  globalError: string
  isSaving: boolean
  isEditing: boolean
  onSubmit: (e?: React.BaseSyntheticEvent) => void
  onSubmitAndAddAnother: (e?: React.BaseSyntheticEvent) => void
  onCancel: () => void
  setValue: ReturnType<typeof useScoreRuleForm>['setValue']
  watchedName: string
  showCreateAndAddAnother?: boolean
}) {
  const { register, formState: { errors } } = form
  const selectedMetric = form.watch('metric')
  const minimum = form.watch('threshold_min')
  const maximum = form.watch('threshold_max')

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* Toggle score existente / novo */}
      <div>
        <label className={LABEL_CLASS}>Em qual score esta regra entra?</label>
        <div className="mb-5 flex max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => { setScoreMode('existing'); setValue('name', '', { shouldValidate: false }) }}
            className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${scoreMode === 'existing' ? 'bg-nf-blue/15 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Score existente
          </button>
          <button
            type="button"
            onClick={() => { setScoreMode('new'); setValue('name', '', { shouldValidate: false }) }}
            className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${scoreMode === 'new' ? 'bg-nf-blue/15 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Criar novo
          </button>
        </div>

        {/* Campo nome */}
        <div className="flex flex-col gap-2">
          <label htmlFor={scoreMode === 'existing' ? 'score-name-select' : 'score-name'} className={LABEL_CLASS}>Score</label>
          {scoreMode === 'existing' ? (
            <>
              <select
                id="score-name-select"
                className={INPUT_CLASS}
                aria-label="Score existente"
                value={watchedName}
                onChange={(e) => setValue('name', e.target.value, { shouldValidate: true })}
              >
                <option value="">Selecione um score…</option>
                {scoreNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {scoreNames.length === 0 && (
                <p className="text-white/40 text-[12px]">Nenhum score ainda. Use "Criar novo".</p>
              )}
            </>
          ) : (
            <input
              id="score-name"
              type="text"
              placeholder="Ex: Dividendos Conservador"
              className={INPUT_CLASS}
              aria-invalid={!!errors.name}
              {...register('name')}
            />
          )}
          {errors.name && <p className={ERROR_CLASS} role="alert">{errors.name.message}</p>}
          <p className="text-xs leading-relaxed text-white/60">Regras com o mesmo nome entram no mesmo score. O nome não altera os pontos.</p>
        </div>
      </div>

      {/* Métrica */}
      <div>
        <label htmlFor="score-metric" className={LABEL_CLASS}>Métrica</label>
        <select id="score-metric" className={INPUT_CLASS} {...register('metric')}>
          {Object.entries(METRIC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errors.metric && <p className={ERROR_CLASS} role="alert">{errors.metric.message}</p>}
        {selectedMetric && <ScoreMetricHelp metric={selectedMetric} />}
      </div>

      {/* Operador */}
      <div>
        <label htmlFor="score-operator" className={LABEL_CLASS}>Operador</label>
        <select id="score-operator" className={INPUT_CLASS} {...register('operator')}>
          {Object.entries(OPERATOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errors.operator && <p className={ERROR_CLASS} role="alert">{errors.operator.message}</p>}
        <p className="mt-2 text-xs leading-relaxed text-white/60">Define a comparação: &lt; e &gt; excluem o limite; ≤ e ≥ o incluem. “Entre” inclui os dois limites.</p>
      </div>

      {/* Valor + Pontos */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="score-threshold-min" className={LABEL_CLASS}>
            {isBetween ? 'Valor mínimo' : 'Valor de referência'}
          </label>
          <input id="score-threshold-min" type="number" step="any" className={INPUT_CLASS}
            {...register('threshold_min', { valueAsNumber: true })} />
          {errors.threshold_min && <p className={ERROR_CLASS} role="alert">{errors.threshold_min.message}</p>}
          <p className="mt-2 text-xs leading-relaxed text-white/60">Limite na unidade do indicador. Ex.: DY 7 significa 7%; P/VP 1,5 significa 1,5 vez. Confira a unidade de Dívida/PL.</p>
        </div>
        <div>
          <label htmlFor="score-points" className={LABEL_CLASS}>Pontos</label>
          <input id="score-points" type="number" step="1" className={INPUT_CLASS}
            {...register('points', { valueAsNumber: true })} />
          {errors.points && <p className={ERROR_CLASS} role="alert">{errors.points.message}</p>}
          <p className="mt-2 text-xs leading-relaxed text-white/60">Soma ao atender a condição. Valor negativo desconta. Se não atender ou faltar dado, contribui com 0.</p>
        </div>
      </div>

      {/* Threshold max (between) */}
      {isBetween && (
        <div>
          <label htmlFor="score-threshold-max" className={LABEL_CLASS}>Valor máximo</label>
          <input id="score-threshold-max" type="number" step="any" className={INPUT_CLASS}
            {...register('threshold_max', { valueAsNumber: true })} />
          {errors.threshold_max && <p className={ERROR_CLASS} role="alert">{errors.threshold_max.message}</p>}
          <p className="mt-2 text-xs text-white/60">Teto do intervalo, incluído na comparação; deve ser maior ou igual ao mínimo.</p>
        </div>
      )}

      {/* Dica */}
      {selectedMetric === 'debt_equity' && (
        <DebtThresholdNotice minimum={minimum} maximum={isBetween ? maximum : null} />
      )}
      <p className="text-[#8F8F8F] text-[11px] leading-relaxed">
        ⓘ Para "entre", informe mínimo e máximo. Os pontos são somados quando a condição é atendida.
      </p>

      {globalError && <p className="text-red-400 text-[13px]" role="alert">{globalError}</p>}

      <hr className="border-none bg-white/[0.08] h-px w-full" />

      {/* Creation has a separate mobile action bar; editing uses these buttons at every width. */}
      <div className={`${isEditing ? 'flex' : 'hidden md:flex'} gap-3 flex-wrap`}>
        <button type="submit" disabled={isSaving}
          className="min-h-11 rounded-xl bg-nf-blue px-5 text-sm font-semibold text-[#11132A] transition-colors hover:bg-[#96A0FF] disabled:opacity-50">
          {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar regra'}
        </button>
        {!isEditing && showCreateAndAddAnother && (
          <button type="button" disabled={isSaving} onClick={onSubmitAndAddAnother}
            className="min-h-11 rounded-xl border border-white/15 px-5 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.06] disabled:opacity-50">
            Criar e adicionar outra
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="min-h-11 rounded-xl border border-white/15 px-5 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.06]">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ── Tela de CRIAÇÃO — página dedicada ─────────────────────────────────────
function ScoreRuleCreatePage() {
  const state = useScoreRuleForm()

  return (
    <div className="flex w-full flex-col gap-6 pb-48 md:gap-8 md:pb-12 md:pt-2">
      <div className="sticky top-0 z-10 -mx-4 flex min-h-16 items-center gap-3 border-b border-white/10 bg-[#131313] px-4 md:hidden">
        <button
          type="button"
          onClick={state.cancel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/[0.07]"
          aria-label={state.returnTo === '/analise/visao-geral' ? 'Voltar para Análise' : 'Voltar para Score'}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold text-white">Nova regra de score</h1>
      </div>

      <div>
        <div className="hidden md:block">
          <button
            type="button"
            onClick={state.cancel}
            className="mb-4 flex min-h-11 items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            ← {state.returnTo === '/analise/visao-geral' ? 'Voltar para Análise' : 'Voltar para Score'}
          </button>
          <h1 className="text-3xl font-semibold leading-tight text-white">Nova regra de score</h1>
          <p className="mt-2 text-sm text-white/50">
            Defina uma condição sobre um indicador fundamentalista e quantos pontos ela vale no score.
          </p>
        </div>

        <p className="text-sm text-white/50 md:hidden">
          Defina uma condição sobre um indicador e quantos pontos ela vale no score.
        </p>
      </div>

      {/* Layout desktop: form + preview lado a lado */}
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-10">
        {/* Painel form */}
        <div className="min-w-0 border-t border-white/10 pt-6">
          <h2 className="mb-6 text-lg font-semibold text-white">Dados da regra</h2>
          <FormDraftNotice {...state.draft} onRestore={state.restoreDraft} onDiscard={state.draft.clear} />
          <ScoreRuleFields
            form={state.form}
            scoreMode={state.scoreMode}
            setScoreMode={state.setScoreMode}
            scoreNames={state.scoreNames}
            isBetween={state.isBetween}
            globalError={state.globalError}
            isSaving={state.isSaving}
            isEditing={false}
            onSubmit={state.onSubmit}
            onSubmitAndAddAnother={state.onSubmitAndAddAnother}
            onCancel={state.cancel}
            setValue={state.setValue}
            watchedName={state.watchedName}
          />
        </div>

        {/* Painel preview — desktop only */}
        <div className="hidden min-w-0 md:block lg:sticky lg:top-6 lg:self-start">
          <div className="border-t border-white/10 pt-6">
            <h2 className="mb-6 text-lg font-semibold text-white">Pré-visualização</h2>
            <ScorePreviewPanel
              scoreName={state.watchedName}
              metric={state.watchedMetric as ScoreMetric | ''}
              operator={state.watchedOperator as ScoreOperator | ''}
              thresholdMin={Number.isFinite(state.watchedMin) ? (state.watchedMin ?? null) : null}
              thresholdMax={Number.isFinite(state.watchedMax) ? (state.watchedMax ?? null) : null}
              points={Number.isFinite(state.watchedPoints) ? (state.watchedPoints ?? null) : null}
              existingRulesInScore={state.existingRulesInScore}
            />
          </div>
        </div>
      </div>

      {/* Preview mobile — abaixo do formulário */}
      <div className="border-t border-white/10 pt-6 md:hidden">
        <h2 className="mb-5 text-lg font-semibold text-white">Pré-visualização</h2>
        <ScorePreviewPanel
          scoreName={state.watchedName}
          metric={state.watchedMetric as ScoreMetric | ''}
          operator={state.watchedOperator as ScoreOperator | ''}
          thresholdMin={Number.isFinite(state.watchedMin) ? (state.watchedMin ?? null) : null}
          thresholdMax={Number.isFinite(state.watchedMax) ? (state.watchedMax ?? null) : null}
          points={Number.isFinite(state.watchedPoints) ? (state.watchedPoints ?? null) : null}
          existingRulesInScore={state.existingRulesInScore}
        />
      </div>

      {/* Barra de ações mobile — fixa na base */}
      <div role="toolbar" aria-label="Ações da regra" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex gap-3 border-t border-white/10 bg-[#1C1C1C]/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <button
          type="button"
          disabled={state.isSaving}
          onClick={state.onSubmit}
          className="min-h-12 flex-1 rounded-xl bg-nf-blue px-4 text-sm font-semibold text-[#11132A] disabled:opacity-50"
        >
          {state.isSaving ? 'Salvando…' : 'Criar regra'}
        </button>
        <button
          type="button"
          onClick={state.cancel}
          className="min-h-12 rounded-xl border border-white/15 px-5 text-sm font-medium text-white/85"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Tela de EDIÇÃO — modal sobre AnaliseScore (comportamento original) ────
function ScoreRuleEditModal({ id }: { id: string }) {
  const state = useScoreRuleForm(id)
  const [isOpen, setIsOpen] = useState(true)
  const navigationTimer = useRef<number | null>(null)
  const BackgroundPage = state.returnTo === '/analise/visao-geral' ? AnaliseVisaoGeral : AnaliseScore

  useEffect(() => () => {
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
  }, [])

  function finishAndReturn() {
    if (navigationTimer.current !== null) return
    state.draft.clear()
    setIsOpen(false)
    navigationTimer.current = window.setTimeout(() => state.navigate(state.returnTo), 300)
  }

  if (state.rulesLoading) {
    return (
      <>
        <BackgroundPage />
        <Modal isOpen title="Editar regra de score" onClose={finishAndReturn} dismissible={isOpen} variant="score" closing={!isOpen}>
          <p className="py-8 text-center text-sm text-white/50">Carregando regra…</p>
        </Modal>
      </>
    )
  }

  if (!state.editingRule) {
    return (
      <>
        <BackgroundPage />
        <Modal isOpen title="Editar regra de score" onClose={finishAndReturn} dismissible={isOpen} variant="score" closing={!isOpen}>
          <p className="py-8 text-center text-sm text-white/50">Regra não encontrada.</p>
        </Modal>
      </>
    )
  }

  return (
    <>
      <BackgroundPage />
      <Modal
        isOpen
        title="Editar regra de score"
        onClose={finishAndReturn}
        dismissible={!state.isSaving && isOpen}
        variant="score"
        closing={!isOpen}
        initialFocusSelector={state.scoreMode === 'new' ? '#score-name' : '#score-name-select'}
      >
        <p className="mb-6 text-sm text-white/50">
          Defina as condições e pontuação para avaliar seus ativos.
        </p>
        <FormDraftNotice {...state.draft} onRestore={state.restoreDraft} onDiscard={state.draft.clear} />
        <ScoreRuleFields
          form={state.form}
          scoreMode={state.scoreMode}
          setScoreMode={state.setScoreMode}
          scoreNames={state.scoreNames}
          isBetween={state.isBetween}
          globalError={state.globalError}
          isSaving={state.isSaving}
          isEditing={true}
          onSubmit={state.onSubmit}
          onSubmitAndAddAnother={state.onSubmitAndAddAnother}
          onCancel={finishAndReturn}
          setValue={state.setValue}
          watchedName={state.watchedName}
          showCreateAndAddAnother={false}
        />
        <section aria-label="Prévia da regra" className="border-t border-white/[0.08] pt-5 mt-2">
          <h2 className="mb-3 text-sm font-semibold text-white">Prévia da regra</h2>
          <ScorePreviewPanel
            scoreName={state.watchedName}
            metric={state.watchedMetric as ScoreMetric | ''}
            operator={state.watchedOperator as ScoreOperator | ''}
            thresholdMin={Number.isFinite(state.watchedMin) ? (state.watchedMin ?? null) : null}
            thresholdMax={Number.isFinite(state.watchedMax) ? (state.watchedMax ?? null) : null}
            points={Number.isFinite(state.watchedPoints) ? (state.watchedPoints ?? null) : null}
            existingRulesInScore={state.existingRulesInScore}
          />
        </section>
      </Modal>
    </>
  )
}

// ── Entry point — router despacha para criação ou edição ──────────────────
export function ScoreRulePage() {
  const { id } = useParams<{ id?: string }>()
  const userId = useAuthStore(state => state.user?.id)
  const { data: rules = [] } = useScoreRules()
  const snapshot = id ? rules.find(rule => rule.id === id) : undefined
  // Remount when identity, rule or original snapshot changes; never mix draft contexts.
  const context = JSON.stringify([userId, id ?? 'new', snapshot])
  if (id) return <ScoreRuleEditModal key={context} id={id} />
  return <ScoreRuleCreatePage key={context} />
}
