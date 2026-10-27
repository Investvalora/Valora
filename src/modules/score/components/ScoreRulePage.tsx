/**
 * ScoreRulePage
 * - Criação (/analise/score/nova): página dedicada com layout desktop dois painéis + mobile scroll
 * - Edição (/analise/score/:id/editar): modal sobre AnaliseScore (comportamento original mantido)
 */
import { useEffect, useRef, useState } from 'react'
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

// ── Tokens de estilo ──────────────────────────────────────────────────────
const INPUT_CLASS =
  'bg-[#585960] border border-[#7B7C83] rounded-[9px] h-[42px] px-3 text-white text-[14px] w-full focus:outline-none focus:ring-1 focus:ring-[rgba(121,135,255,0.5)]'
const LABEL_CLASS = 'text-white text-[12px] font-medium mb-1.5 block'
const ERROR_CLASS = 'text-red-400 text-[11px] mt-1'

// ── Hook compartilhado de lógica de formulário ────────────────────────────
function useScoreRuleForm(id?: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = Boolean(id)
  const returnTo = isEditing && location.state?.returnTo === '/analise/visao-geral'
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
    navigate, returnTo, setValue,
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

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {/* Toggle score existente / novo */}
      <div>
        <label className={LABEL_CLASS}>Em qual score esta regra entra?</label>
        <div className="bg-[#393939] border border-[#7A7A7A]/50 rounded-[20px] p-[3px] flex mb-3">
          <button
            type="button"
            onClick={() => { setScoreMode('existing'); setValue('name', '', { shouldValidate: false }) }}
            className={`flex-1 text-[12px] font-medium py-[7px] text-center rounded-[17px] transition-colors ${scoreMode === 'existing' ? 'bg-white/[0.16] text-white' : 'text-[#8F8F8F]'}`}
          >
            Score existente
          </button>
          <button
            type="button"
            onClick={() => { setScoreMode('new'); setValue('name', '', { shouldValidate: false }) }}
            className={`flex-1 text-[12px] font-medium py-[7px] text-center rounded-[17px] transition-colors ${scoreMode === 'new' ? 'bg-white/[0.16] text-white' : 'text-[#8F8F8F]'}`}
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
        </div>
      </div>

      {/* Métrica */}
      <div>
        <label htmlFor="score-metric" className={LABEL_CLASS}>Métrica</label>
        <select id="score-metric" className={INPUT_CLASS} {...register('metric')}>
          {Object.entries(METRIC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errors.metric && <p className={ERROR_CLASS} role="alert">{errors.metric.message}</p>}
      </div>

      {/* Operador */}
      <div>
        <label htmlFor="score-operator" className={LABEL_CLASS}>Operador</label>
        <select id="score-operator" className={INPUT_CLASS} {...register('operator')}>
          {Object.entries(OPERATOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errors.operator && <p className={ERROR_CLASS} role="alert">{errors.operator.message}</p>}
      </div>

      {/* Valor + Pontos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="score-threshold-min" className={LABEL_CLASS}>
            {isBetween ? 'Valor mínimo' : 'Valor de referência'}
          </label>
          <input id="score-threshold-min" type="number" step="any" className={INPUT_CLASS}
            {...register('threshold_min', { valueAsNumber: true })} />
          {errors.threshold_min && <p className={ERROR_CLASS} role="alert">{errors.threshold_min.message}</p>}
        </div>
        <div>
          <label htmlFor="score-points" className={LABEL_CLASS}>Pontos</label>
          <input id="score-points" type="number" step="1" className={INPUT_CLASS}
            {...register('points', { valueAsNumber: true })} />
          {errors.points && <p className={ERROR_CLASS} role="alert">{errors.points.message}</p>}
        </div>
      </div>

      {/* Threshold max (between) */}
      {isBetween && (
        <div>
          <label htmlFor="score-threshold-max" className={LABEL_CLASS}>Valor máximo</label>
          <input id="score-threshold-max" type="number" step="any" className={INPUT_CLASS}
            {...register('threshold_max', { valueAsNumber: true })} />
          {errors.threshold_max && <p className={ERROR_CLASS} role="alert">{errors.threshold_max.message}</p>}
        </div>
      )}

      {/* Dica */}
      <p className="text-[#8F8F8F] text-[11px] leading-relaxed">
        ⓘ Para "entre", informe mínimo e máximo. Os pontos são somados quando a condição é atendida.
      </p>

      {globalError && <p className="text-red-400 text-[13px]" role="alert">{globalError}</p>}

      <hr className="border-none bg-white/[0.08] h-px w-full" />

      {/* Botões desktop */}
      <div className="hidden md:flex gap-3 flex-wrap">
        <button type="submit" disabled={isSaving}
          className="bg-[#2B6DB0] h-[46px] px-[18px] rounded-[8px] text-white font-semibold text-[15px] hover:bg-[#2460A0] transition-colors disabled:opacity-50">
          {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar regra'}
        </button>
        {!isEditing && showCreateAndAddAnother && (
          <button type="button" disabled={isSaving} onClick={onSubmitAndAddAnother}
            className="border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[14px] hover:bg-white/[0.05] transition-colors disabled:opacity-50">
            Criar e adicionar outra
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[15px] hover:bg-white/[0.05] transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ── Tela de CRIAÇÃO — página dedicada ─────────────────────────────────────
function ScoreRuleCreatePage() {
  const state = useScoreRuleForm()
  const { navigate } = state

  return (
    <div className="flex flex-col gap-5 pb-32 md:pb-10">
      {/* Header */}
      <div>
        {/* Mobile: botão voltar + título compacto */}
        <div className="flex items-center gap-3 mb-1 md:hidden">
          <button
            type="button"
            onClick={() => navigate('/analise/score')}
            className="bg-[#393939] rounded-[16px] size-[32px] flex items-center justify-center shrink-0"
            aria-label="Voltar"
          >
            <span className="text-white text-[14px]">←</span>
          </button>
          <div>
            <p className="text-[#8F8F8F] text-[11px]">Análise › Score</p>
            <p className="text-white text-[20px] font-semibold leading-tight">Nova regra de score</p>
          </div>
        </div>

        {/* Desktop: breadcrumb + título grande */}
        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => navigate('/analise/score')}
            className="flex items-center gap-1.5 text-[#8F8F8F] text-[13px] mb-4 hover:text-white transition-colors"
          >
            ← Análise › Score Fundamentalista
          </button>
          <h1 className="text-white text-[32px] font-medium leading-tight">Nova regra de score</h1>
          <p className="text-[#8F8F8F] text-[14px] mt-1">
            Defina uma condição sobre um indicador fundamentalista e quantos pontos ela vale no score.
          </p>
        </div>

        {/* Mobile: subtítulo */}
        <p className="text-[#8F8F8F] text-[12px] mt-2 md:hidden">
          Defina uma condição sobre um indicador e quantos pontos ela vale no score.
        </p>
      </div>

      {/* Layout desktop: form + preview lado a lado */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Painel form */}
        <div className="flex-1 min-w-0 bg-[#1B1B1B] border border-white/[0.08] rounded-[14px] px-[28px] pt-[26px] pb-[28px]">
          <h2 className="text-white font-semibold text-[16px] mb-5">Dados da regra</h2>
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
            onCancel={() => navigate('/analise/score')}
            setValue={state.setValue}
            watchedName={state.watchedName}
          />
        </div>

        {/* Painel preview — desktop only */}
        <div className="hidden md:block w-[420px] flex-shrink-0">
          <div className="bg-[#1B1B1B] border border-white/[0.08] rounded-[14px] p-6">
            <p className="text-white/80 font-semibold text-[15px] mb-4">Pré-visualização</p>
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

      {/* Preview mobile — inline, abaixo do form */}
      <div className="md:hidden">
        <div className="bg-[rgba(121,135,255,0.08)] border border-[rgba(121,135,255,0.5)] rounded-[10px] px-[16px] py-[14px] mb-3">
          <p className="text-[#B8C0FF] text-[11px] mb-1">
            Pré-visualização · {state.watchedName || 'Novo score'}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-white text-[18px] font-semibold">
              {state.watchedMetric && state.watchedOperator && Number.isFinite(state.watchedMin)
                ? `${METRIC_LABELS[state.watchedMetric as ScoreMetric] ?? state.watchedMetric} ${
                    { lt: '<', lte: '≤', gt: '>', gte: '≥', between: 'entre' }[state.watchedOperator] ?? state.watchedOperator
                  } ${state.watchedMin}`
                : '—'}
            </p>
            {Number.isFinite(state.watchedPoints) && state.watchedPoints !== undefined && (
              <span className="bg-[rgba(51,170,59,0.18)] text-[#63D16B] px-[10px] py-[3px] rounded-[8px] text-[12px] font-semibold">
                {(state.watchedPoints ?? 0) > 0 ? '+' : ''}{state.watchedPoints} pontos
              </span>
            )}
          </div>
        </div>

        <ScorePreviewPanel
          scoreName={state.watchedName}
          metric={state.watchedMetric as ScoreMetric | ''}
          operator={state.watchedOperator as ScoreOperator | ''}
          thresholdMin={Number.isFinite(state.watchedMin) ? (state.watchedMin ?? null) : null}
          thresholdMax={Number.isFinite(state.watchedMax) ? (state.watchedMax ?? null) : null}
          points={Number.isFinite(state.watchedPoints) ? (state.watchedPoints ?? null) : null}
          existingRulesInScore={state.existingRulesInScore}
          hideTitleCard
        />
      </div>

      {/* Barra de ações mobile — fixa na base */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C] border-t border-white/[0.08] flex gap-3 px-[26px] pt-[14px] pb-[24px] md:hidden z-10">
        <button
          type="button"
          disabled={state.isSaving}
          onClick={state.onSubmit}
          className="bg-[#2B6DB0] flex-1 h-[48px] rounded-[8px] text-white font-semibold text-[15px] disabled:opacity-50"
        >
          {state.isSaving ? 'Salvando…' : 'Criar regra'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/analise/score')}
          className="border border-white/25 h-[48px] w-[110px] rounded-[8px] text-white font-medium text-[15px]"
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
  if (id) return <ScoreRuleEditModal id={id} />
  return <ScoreRuleCreatePage />
}
