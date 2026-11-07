import { INDICATOR_IDS, INDICATOR_OPERATORS } from '../../../shared/indicators/catalog'
import { z } from 'zod'

const VALID_METRICS = INDICATOR_IDS
const VALID_OPERATORS = INDICATOR_OPERATORS

/**
 * Schema Zod para criação e edição de regras de score.
 *
 * Regra de negócio:
 * - Operador `between` exige `threshold_max` preenchido e maior que `threshold_min`.
 * - Demais operadores: `threshold_max` deve ser omitido/null.
 * - `points` deve ser número inteiro (positivo ou negativo).
 */
export const scoreRuleSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    metric: z.enum(VALID_METRICS, { error: 'Métrica inválida' }),
    operator: z.enum(VALID_OPERATORS, {
      error: 'Operador inválido',
    }),
    threshold_min: z
      .number({ error: issue => issue.input === undefined ? 'Limiar obrigatório' : 'Informe um número' })
      .finite('Deve ser um número finito'),
    threshold_max: z
      .number({ error: 'Informe um número' })
      .finite('Deve ser um número finito')
      .optional()
      .nullable(),
    points: z
      .number({ error: issue => issue.input === undefined ? 'Pontos obrigatórios' : 'Informe um número' })
      .int('Pontos devem ser número inteiro'),
  })
  .superRefine((data, ctx) => {
    if (data.operator === 'between') {
      if (data.threshold_max == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['threshold_max'],
          message: 'Obrigatório para operador "entre"',
        })
      } else if (data.threshold_max <= data.threshold_min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['threshold_max'],
          message: 'Limite máximo deve ser maior que o mínimo',
        })
      }
    }
  })

export type ScoreRuleFormValues = z.infer<typeof scoreRuleSchema>
