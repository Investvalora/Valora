import { z } from 'zod'
import { useAuth } from '../../auth/hooks/useAuth'
import { useFormDraft } from '../../../shared/hooks/useFormDraft'
import { draftKey } from '../../../shared/utils/sessionDraft'

const schema = z.object({ ticker: z.string().max(40), price: z.string().max(100), condition: z.enum(['below', 'above']) })
type PriceDraft = z.infer<typeof schema>
const validate = (value: unknown): PriceDraft | null => { const result = schema.safeParse(value); return result.success ? result.data : null }

export function usePriceAlertDraft(form: string, value: PriceDraft, initialTicker = '') {
  const { user } = useAuth()
  return useFormDraft(user?.id ? draftKey(user.id, 'global', `price-alert:${form}:${initialTicker}`) : null,
    value, value.ticker !== initialTicker || value.price !== '' || value.condition !== 'below', validate)
}
