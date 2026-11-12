import { z } from 'zod'

export const assetTransactionDraftSchema = z.object({
  type: z.enum(['buy', 'sell']),
  transaction_date: z.string().max(20),
  quantity: z.string().max(100),
  price: z.string().max(100),
  brokerage_fee: z.string().max(100),
})
