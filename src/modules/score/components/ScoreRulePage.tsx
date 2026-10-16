/**
 * ScoreRulePage — página dedicada de criação e edição de regra de score.
 * Rota: /analise/score/nova  e  /analise/score/:id/editar
 */
import { useEffect, useState } from 'react'
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

// ── Classe CSS compartilhadas ──────────────────────────────────────────────
const INPUT_CLASS =
  'bg-[#585960] border border-[#7B7C83] rounded-[9px] h-[42px] px-3 text-white text-[14px] w-full focus:outline-none focus:ring-1 focus:ring-[rgba(121,135,255,0.5)]'

const LABEL_CLASS = 'text-white/60 text-[12px] mb-1.5 block'

const ERROR_CLASS = 'text-red-400 text-[11px] mt-1'

// ── Componente principal ───────────────────────────────────────────────────
export function ScoreRulePage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

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
      navigate('/analise/score')
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  const onSubmitAndAddAnother = handleSubmit(async (values) => {
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
      <div className="flex h-40 items-center justify-center">
        <span className="text-sm text-white/40 animate-pulse">Carregando…</span>
      </div>
    )
  }

  if (isEditing && !rulesLoading && !editingRule) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-white/50 text-[14px]">Regra não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/analise/score')}
          className="text-[13px] font-medium text-[#2B6DB0] hover:underline"
        >
          ← Voltar para Score
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-1 pb-10">
      {/* ── Cabeçalho ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/analise/score')}
          className="flex items-center gap-1.5 text-[#8F8F8F] text-[13px] mb-4 hover:text-white transition-colors"
        >
          ← Análise › Score Fundamentalista
        </button>
        <h1 className="text-white text-[32px] font-bold leading-tight">
          {isEditing ? 'Editar regra de score' : 'Nova regra de score'}
        </h1>
        <p className="text-white/50 text-[14px] mt-1">
          Defina as condições e pontuação para avaliar seus ativos.
        </p>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── Painel esquerdo — form ── */}
        <div className="flex-1 min-w-0 bg-[#1B1B1B] border border-white/[0.08] rounded-[14px] p-7">
          <h2 className="text-white font-semibold text-[16px] mb-5">Dados da regra</h2>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {/* ── Toggle: score existente / novo ── */}
            <div>
              <label className={LABEL_CLASS}>Em qual score esta regra entra?</label>
              <div className="bg-[#393939] border border-[#7A7A7A]/50 rounded-[20px] p-[3px] flex mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setScoreMode('existing')
                    setValue('name', '', { shouldValidate: false })
                  }}
                  className={`flex-1 text-[12px] font-medium py-[7px] text-center rounded-[17px] transition-colors ${
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
                  className={`flex-1 text-[12px] font-medium py-[7px] text-center rounded-[17px] transition-colors ${
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="flex gap-3 flex-wrap">
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className="bg-[#2B6DB0] h-[46px] px-[18px] rounded-[8px] text-white font-semibold text-[15px] hover:bg-[#2460A0] transition-colors disabled:opacity-50"
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
                  className="border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[14px] hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                >
                  Criar e adicionar outra
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/analise/score')}
                className="border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[15px] hover:bg-white/[0.05] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* ── Painel direito — preview ── */}
        <div className="w-full md:w-auto">
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
        </div>
      </div>
    </div>
  )
}
