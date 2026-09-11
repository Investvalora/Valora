import { z } from 'zod'

const VALID_METRICS = ['pl', 'pvp', 'roe', 'dy', 'debt_equity', 'net_margin'] as const
const VALID_OPERATORS = ['lt', 'lte', 'gt', 'gte', 'between'] as const

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
    metric: z.enum(VALID_METRICS, { errorMap: () => ({ message: 'Métrica inválida' }) }),
    operator: z.enum(VALID_OPERATORS, {
      errorMap: () => ({ message: 'Operador inválido' }),
    }),
    threshold_min: z
      .number({ invalid_type_error: 'Informe um número', required_error: 'Limiar obrigatório' })
      .finite('Deve ser um número finito'),
    threshold_max: z
      .number({ invalid_type_error: 'Informe um número' })
      .finite('Deve ser um número finito')
      .optional()
      .nullable(),
    points: z
      .number({ invalid_type_error: 'Informe um número', required_error: 'Pontos obrigatórios' })
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
