/**
 * ScoreRulePage — editor modal de criação e edição de regra de score.
 * Rota: /analise/score/nova  e  /analise/score/:id/editar
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

// ── Classe CSS compartilhadas ──────────────────────────────────────────────
const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 text-sm text-white focus:border-nf-blue/60 focus:outline-none focus:ring-1 focus:ring-nf-blue/30'

const LABEL_CLASS = 'text-white/60 text-[12px] mb-1.5 block'

const ERROR_CLASS = 'text-red-400 text-[11px] mt-1'

// ── Componente principal ───────────────────────────────────────────────────
export function ScoreRulePage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isOpen, setIsOpen] = useState(true)
  const navigationTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
  }, [])

  function finishAndReturn() {
    if (navigationTimer.current !== null) return
    setIsOpen(false)
    navigationTimer.current = window.setTimeout(() => navigate('/analise/score'), 300)
  }

  const { data: rules = [], isLoading: rulesLoading } = useScoreRules()
  const createRule = useCreateScoreRule()
  const updateRule = useUpdateScoreRule()

  // Regra sendo editada (undefined em criação, ScoreRule em edição)
  const editingRule: ScoreRule | undefined = id
    ? rules.find((r) => r.id === id)
    : undefined

  // Toggle: score existente ou novo
  const [scoreMode, setScoreMode] = useState<'existing' | 'new'>('existing')

  // Nomes de scores existentes para o select
  const scoreGroups = groupRulesByName(rules)
  const scoreNames = Array.from(scoreGroups.keys())

  useEffect(() => {
    if (!rulesLoading && !isEditing && scoreNames.length === 0) setScoreMode('new')
  }, [rulesLoading, isEditing, scoreNames.length])

  const [globalError, setGlobalError] = useState('')
  const isSaving = createRule.isPending || updateRule.isPending

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ScoreRuleFormValues>({
    resolver: zodResolver(scoreRuleSchema),
    defaultValues: {
      operator: 'gte',
      metric: 'dy',
      name: '',
    },
  })

  // Reset quando a regra de edição carrega
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
      // Se o nome da regra existe nos grupos, usar modo 'existing'
      setScoreMode(scoreNames.includes(editingRule.name) ? 'existing' : 'new')
    }
  }, [editingRule]) // eslint-disable-line react-hooks/exhaustive-deps

  // Observar todos os campos para o preview em tempo real
  const watchedName = watch('name') ?? ''
  const watchedMetric = watch('metric') ?? ''
  const watchedOperator = watch('operator') ?? ''
  const watchedThresholdMin = watch('threshold_min')
  const watchedThresholdMax = watch('threshold_max')
  const watchedPoints = watch('points')

  const isBetween = watchedOperator === 'between'

  // Regras existentes no mesmo score (excluindo a que está sendo editada)
  const existingRulesInScore: ScoreRule[] = watchedName
    ? (scoreGroups.get(watchedName) ?? []).filter((r) => r.id !== id)
    : []

  const onSubmit = handleSubmit(async (values) => {
    if (!isOpen) return
    setGlobalError('')
    try {
      const payload = {
        ...values,
        threshold_max: isBetween ? (values.threshold_max ?? null) : null,
      }

      if (isEditing && id) {
        await updateRule.mutateAsync({ id, payload })
      } else {
        await createRule.mutateAsync(payload)
      }
      finishAndReturn()
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  const onSubmitAndAddAnother = handleSubmit(async (values) => {
    if (!isOpen) return
    setGlobalError('')
    try {
      const payload = {
        ...values,
        threshold_max: isBetween ? (values.threshold_max ?? null) : null,
      }
      await createRule.mutateAsync(payload)
      reset({ operator: 'gte', metric: 'dy', name: '' })
      setScoreMode('existing')
      setGlobalError('')
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  // Estado de carregamento na edição (regra ainda não chegou)
  if (isEditing && rulesLoading) {
    return (
      <><AnaliseScore /><Modal isOpen title="Editar regra de score" onClose={finishAndReturn} dismissible={isOpen} variant="score" closing={!isOpen}><p className="py-8 text-center text-sm text-white/50">Carregando regra…</p></Modal></>
    )
  }

  if (isEditing && !rulesLoading && !editingRule) {
    return (
      <><AnaliseScore /><Modal isOpen title="Editar regra de score" onClose={finishAndReturn} dismissible={isOpen} variant="score" closing={!isOpen}><p className="py-8 text-center text-sm text-white/50">Regra não encontrada.</p></Modal></>
    )
  }

  return (
    <>
      <AnaliseScore />
      <Modal
        isOpen
        title={isEditing ? 'Editar regra de score' : 'Nova regra de score'}
        onClose={finishAndReturn}
        dismissible={!isSaving && isOpen}
        variant="score"
        closing={!isOpen}
        initialFocusSelector={scoreMode === 'new' ? '#score-name' : '#score-name-select'}
      >
        <p className="mb-6 text-sm text-white/50">
          Defina as condições e pontuação para avaliar seus ativos.
        </p>
      <div className="flex flex-col gap-6">
        <div className="min-w-0">
          <h2 className="mb-5 text-base font-semibold text-white">Dados da regra</h2>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {/* ── Toggle: score existente / novo ── */}
            <div>
              <label className={LABEL_CLASS}>Em qual score esta regra entra?</label>
              <div className="mb-3 flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setScoreMode('existing')
                    setValue('name', '', { shouldValidate: false })
                  }}
                  className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors ${
                    scoreMode === 'existing'
                      ? 'bg-white/[0.16] text-white'
                      : 'text-[#8F8F8F]'
                  }`}
                >
                  Score existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScoreMode('new')
                    setValue('name', '', { shouldValidate: false })
                  }}
                  className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors ${
                    scoreMode === 'new'
                      ? 'bg-white/[0.16] text-white'
                      : 'text-[#8F8F8F]'
                  }`}
                >
                  Criar novo score
                </button>
              </div>

              {/* Score existente — select */}
              {scoreMode === 'existing' ? (
                <div>
                  <select
                    id="score-name-select"
                    className={INPUT_CLASS}
                    aria-label="Score existente"
                    value={watchedName}
                    onChange={(e) => setValue('name', e.target.value, { shouldValidate: true })}
                  >
                    <option value="">Selecione um score…</option>
                    {scoreNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {scoreNames.length === 0 && (
                    <p className="text-white/40 text-[12px] mt-1.5">
                      Nenhum score criado ainda. Use "Criar novo score".
                    </p>
                  )}
                </div>
              ) : (
                /* Novo score — input de texto */
                <div>
                  <input
                    id="score-name"
                    type="text"
                    placeholder="Ex: Dividendos Conservador"
                    className={INPUT_CLASS}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'score-name-error' : undefined}
                    {...register('name')}
                  />
                </div>
              )}

              {errors.name && (
                <p id="score-name-error" className={ERROR_CLASS} role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* ── Métrica + Operador ── */}
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <div>
                <label htmlFor="score-metric" className={LABEL_CLASS}>
                  Métrica
                </label>
                <select
                  id="score-metric"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.metric}
                  {...register('metric')}
                >
                  {Object.entries(METRIC_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.metric && (
                  <p className={ERROR_CLASS} role="alert">
                    {errors.metric.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="score-operator" className={LABEL_CLASS}>
                  Operador
                </label>
                <select
                  id="score-operator"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.operator}
                  {...register('operator')}
                >
                  {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.operator && (
                  <p className={ERROR_CLASS} role="alert">
                    {errors.operator.message}
                  </p>
                )}
              </div>
            </div>

            {/* ── Threshold min + Pontos ── */}
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <div>
                <label htmlFor="score-threshold-min" className={LABEL_CLASS}>
                  {isBetween ? 'Valor mínimo' : 'Valor de referência'}
                </label>
                <input
                  id="score-threshold-min"
                  type="number"
                  step="any"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.threshold_min}
                  aria-describedby={
                    errors.threshold_min ? 'score-threshold-min-error' : undefined
                  }
                  {...register('threshold_min', { valueAsNumber: true })}
                />
                {errors.threshold_min && (
                  <p id="score-threshold-min-error" className={ERROR_CLASS} role="alert">
                    {errors.threshold_min.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="score-points" className={LABEL_CLASS}>
                  Pontos
                </label>
                <input
                  id="score-points"
                  type="number"
                  step="1"
                  placeholder="Ex: 10"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.points}
                  aria-describedby={errors.points ? 'score-points-error' : undefined}
                  {...register('points', { valueAsNumber: true })}
                />
                {errors.points && (
                  <p id="score-points-error" className={ERROR_CLASS} role="alert">
                    {errors.points.message}
                  </p>
                )}
              </div>
            </div>

            {/* ── Threshold max (somente 'between') ── */}
            {isBetween && (
              <div>
                <label htmlFor="score-threshold-max" className={LABEL_CLASS}>
                  Valor máximo
                </label>
                <input
                  id="score-threshold-max"
                  type="number"
                  step="any"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.threshold_max}
                  aria-describedby={
                    errors.threshold_max ? 'score-threshold-max-error' : undefined
                  }
                  {...register('threshold_max', { valueAsNumber: true })}
                />
                {errors.threshold_max && (
                  <p id="score-threshold-max-error" className={ERROR_CLASS} role="alert">
                    {errors.threshold_max.message}
                  </p>
                )}
              </div>
            )}

            <p className="text-white/40 text-[12px]">
              Os pontos são somados ao score do ativo quando a condição for satisfeita.
            </p>

            {/* Erro global */}
            {globalError && (
              <p className="text-red-400 text-[13px]" role="alert">
                {globalError}
              </p>
            )}

            <hr className="border-none bg-white/[0.08] h-px w-full my-1" />

            {/* ── Botões ── */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className="min-h-11 flex-1 rounded-xl bg-nf-blue px-4 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {isSaving
                  ? 'Salvando…'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Criar regra'}
              </button>

              {!isEditing && (
                <button
                  type="button"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  onClick={onSubmitAndAddAnother}
                  className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Criar e adicionar outra
                </button>
              )}

              <button
                type="button"
                onClick={finishAndReturn}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <section aria-label="Prévia da regra" className="border-t border-white/[0.08] pt-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Prévia da regra</h2>
          <ScorePreviewPanel
            scoreName={watchedName}
            metric={watchedMetric as ScoreMetric | ''}
            operator={watchedOperator as ScoreOperator | ''}
            thresholdMin={
              watchedThresholdMin !== undefined && Number.isFinite(watchedThresholdMin)
                ? watchedThresholdMin
                : null
            }
            thresholdMax={
              watchedThresholdMax !== undefined &&
              watchedThresholdMax !== null &&
              Number.isFinite(watchedThresholdMax)
                ? watchedThresholdMax
                : null
            }
            points={
              watchedPoints !== undefined && Number.isFinite(watchedPoints)
                ? watchedPoints
                : null
            }
            existingRulesInScore={existingRulesInScore}
          />
        </section>
      </div>
      </Modal>
    </>
  )
}
