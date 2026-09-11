import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { scoreRuleSchema, type ScoreRuleFormValues } from '../utils/scoreValidation'
import { useCreateScoreRule, useUpdateScoreRule } from '../hooks/useScoreRules'
import { METRIC_LABELS, OPERATOR_LABELS, type ScoreRule } from '../types'

interface ScoreRuleFormProps {
  /** Regra existente para edição; undefined = criação. */
  editingRule?: ScoreRule
  onSuccess: () => void
  onCancel: () => void
  /** Avisa a página quando há escrita em voo (para bloquear fechamento do modal). */
  onBusyChange?: (isBusy: boolean) => void
}

const INPUT_CLASS =
  'w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const SELECT_CLASS =
  'w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const LABEL_CLASS = 'block text-sm font-medium text-gray-300 mb-1'

const ERROR_CLASS = 'text-red-400 text-xs mt-1'

export function ScoreRuleForm({
  editingRule,
  onSuccess,
  onCancel,
  onBusyChange,
}: ScoreRuleFormProps) {
  const [globalError, setGlobalError] = useState('')

  const createRule = useCreateScoreRule()
  const updateRule = useUpdateScoreRule()

  const isSaving = createRule.isPending || updateRule.isPending

  useEffect(() => {
    onBusyChange?.(isSaving)
  }, [isSaving, onBusyChange])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScoreRuleFormValues>({
    resolver: zodResolver(scoreRuleSchema),
    defaultValues: editingRule
      ? {
          name: editingRule.name,
          metric: editingRule.metric,
          operator: editingRule.operator,
          threshold_min: editingRule.threshold_min,
          threshold_max: editingRule.threshold_max ?? undefined,
          points: editingRule.points,
        }
      : {
          operator: 'gte',
          metric: 'pl',
        },
  })

  // Redefine os valores quando a regra em edição muda (reutilização do form)
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
    }
  }, [editingRule, reset])

  const operator = watch('operator')
  const isBetween = operator === 'between'

  const onSubmit = handleSubmit(async (values) => {
    setGlobalError('')
    try {
      const payload = {
        ...values,
        threshold_max: isBetween ? (values.threshold_max ?? null) : null,
      }

      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, payload })
      } else {
        await createRule.mutateAsync(payload)
      }
      onSuccess()
    } catch (err) {
      setGlobalError('Ocorreu um erro ao salvar a regra. Tente novamente.')
      console.error(err)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Nome do Score */}
      <div>
        <label htmlFor="score-name" className={LABEL_CLASS}>
          Nome do Score
        </label>
        <input
          id="score-name"
          type="text"
          placeholder="Ex: Dividendos Conservador"
          className={INPUT_CLASS}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'score-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="score-name-error" className={ERROR_CLASS} role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Métrica */}
      <div>
        <label htmlFor="score-metric" className={LABEL_CLASS}>
          Métrica
        </label>
        <select
          id="score-metric"
          className={SELECT_CLASS}
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

      {/* Operador */}
      <div>
        <label htmlFor="score-operator" className={LABEL_CLASS}>
          Operador
        </label>
        <select
          id="score-operator"
          className={SELECT_CLASS}
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

      {/* Limiares */}
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
            aria-describedby={errors.threshold_min ? 'score-threshold-min-error' : undefined}
            {...register('threshold_min', { valueAsNumber: true })}
          />
          {errors.threshold_min && (
            <p id="score-threshold-min-error" className={ERROR_CLASS} role="alert">
              {errors.threshold_min.message}
            </p>
          )}
        </div>

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
              aria-describedby={errors.threshold_max ? 'score-threshold-max-error' : undefined}
              {...register('threshold_max', { valueAsNumber: true })}
            />
            {errors.threshold_max && (
              <p id="score-threshold-max-error" className={ERROR_CLASS} role="alert">
                {errors.threshold_max.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pontos */}
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

      {/* Erro global */}
      {globalError && (
        <p className="text-red-400 text-sm" role="alert">
          {globalError}
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isSaving ? 'Salvando…' : editingRule ? 'Salvar alterações' : 'Criar regra'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-3 bg-dark-bg border border-dark-border text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-50 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
