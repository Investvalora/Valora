import { z } from 'zod'
import { useAuth } from '../../auth/hooks/useAuth'
import { useFormDraft } from '../../../shared/hooks/useFormDraft'
import { draftKey, readDraft } from '../../../shared/utils/sessionDraft'

const schema = z.object({ ticker: z.string().max(40), price: z.string().max(100), condition: z.enum(['below', 'above']) })
type PriceDraft = z.infer<typeof schema>
const validate = (value: unknown): PriceDraft | null => { const result = schema.safeParse(value); return result.success ? result.data : null }

const priceDraftKey = (userId: string, form: string, ticker: string) => draftKey(userId, 'global', `price-alert:${form}:${ticker}`)

export function readOnboardingAlertDraft(userId: string | undefined, ticker: string) {
  return userId ? validate(readDraft(priceDraftKey(userId, 'onboarding', ticker))) : null
}

export function usePriceAlertDraft(form: string, value: PriceDraft, initialTicker = '') {
  const { user } = useAuth()
  return useFormDraft(user?.id ? priceDraftKey(user.id, form, initialTicker) : null,
    value, value.ticker !== initialTicker || value.price !== '' || value.condition !== 'below', validate)
}
