import { z } from 'zod'
import { INDICATOR_IDS, INDICATOR_OPERATORS } from '../../../shared/indicators/catalog'

// Drafts may be incomplete; submission still uses scoreRuleSchema.
const schema = z.object({
  scoreMode: z.enum(['existing', 'new']),
  name: z.string().max(10000),
  metric: z.enum(INDICATOR_IDS),
  operator: z.enum(INDICATOR_OPERATORS),
  threshold_min: z.number().finite().nullable(),
  threshold_max: z.number().finite().nullable(),
  points: z.number().finite().nullable(),
})
export type ScoreDraft = z.infer<typeof schema>
export function validateScoreDraft(value: unknown): ScoreDraft | null {
  const result = schema.safeParse(value)
  return result.success ? result.data : null
}
