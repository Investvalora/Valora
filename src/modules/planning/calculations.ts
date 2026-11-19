import { z } from 'zod'
import { validTargets, type AllocationTargets } from '../ativos/utils/allocationTargets'

/** Integer cents, capped by positive gaps; no sales or implicit extra cash. */
export function planContribution(amount: number, current: Record<string, number>, targets: AllocationTargets, minimum: number) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12 || !Number.isFinite(minimum) || minimum < 0 || !validTargets(targets) || !Object.keys(targets).length || Object.values(current).some(value => !Number.isFinite(value) || value < 0)) return null
  const cash = Math.floor(amount * 100 + 1e-7)
  const total = Object.values(current).reduce((sum, value) => sum + value, 0) + cash / 100
  const gaps = Object.entries(targets).map(([type, target]) => ({ type: type as keyof AllocationTargets, gap: Math.max(0, Math.floor((total * (target ?? 0) / 100 - (current[type] ?? 0)) * 100 + 1e-7)) }))
  const sum = gaps.reduce((value, row) => value + row.gap, 0)
  const allocated = gaps.map(row => ({ ...row, cents: sum ? Math.min(row.gap, Math.floor(cash * row.gap / sum)) : 0 }))
  // Largest remainder preserves cents without allocating more than a class gap.
  let remainder = cash - allocated.reduce((value, row) => value + row.cents, 0)
  for (const row of [...allocated].sort((a, b) => (sum ? cash * b.gap / sum - b.cents - (cash * a.gap / sum - a.cents) : 0) || a.type.localeCompare(b.type))) {
    if (remainder > 0 && row.cents < row.gap) { row.cents++; remainder-- }
  }
  const rows = allocated.map(row => ({ type: row.type, amount: row.cents / 100 >= minimum ? row.cents / 100 : 0 }))
  return { rows, remainder: (cash - rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0)) / 100 }
}
const id = z.string().uuid()
const decimal = z.string().max(64).regex(/^\d+(?:\.\d+)?$/).refine(value => Number.isFinite(Number(value)) && Number(value) >= 0)
const positiveDecimal = decimal.refine(value => Number(value) > 0)
const record = z.object({ id, user_id: id, wallet_id: id }).passthrough()
export const backupSchema = z.object({
  format: z.literal('valora-wallet'), version: z.literal(1), decimal_encoding: z.literal('exact-string'), fixed_income_currency: z.literal('BRL'), exported_at: z.iso.datetime({ offset: true }),
  wallet: z.object({ id, user_id: id, name: z.string().min(1) }).passthrough(),
  transactions: z.array(record.extend({ ticker: z.string().min(1), type: z.enum(['buy', 'sell', 'bonus', 'dividend', 'jcp']), quantity: positiveDecimal, price: decimal, transaction_date: z.iso.date() })),
  positions: z.array(record.extend({ ticker: z.string().min(1), quantity: decimal })),
  fixed_income_positions: z.array(record.extend({ name: z.string().min(1), principal: decimal, application_date: z.iso.date(), maturity_date: z.iso.date().nullable(), active: z.boolean() })), fixed_income_events: z.array(record.extend({ position_id: id, type: z.enum(['coupon','redemption']), event_date: z.iso.date(), amount: positiveDecimal, principal_redeemed: decimal, balance_after: decimal })),
  wallet_income: z.array(record.extend({ ticker: z.string().min(1), import_id: id, currency: z.enum(['BRL', 'USD']), payment_date: z.iso.date(), net_amount: decimal })),
  wallet_income_imports: z.array(record), transaction_import_batches: z.array(record),
  assets: z.array(z.object({ ticker: z.string().min(1), currency: z.enum(['BRL', 'USD']), type: z.string().min(1) }).passthrough()),
}).superRefine((value, ctx) => {
  for (const key of ['transactions', 'positions', 'fixed_income_positions', 'fixed_income_events', 'wallet_income', 'wallet_income_imports', 'transaction_import_batches'] as const) {
    const ids = new Set<string>()
    value[key].forEach((row, index) => {
      if (row.wallet_id !== value.wallet.id || row.user_id !== value.wallet.user_id) ctx.addIssue({ code: 'custom', message: 'Registro pertence a outra carteira ou usuário', path: [key, index] })
      if (ids.has(row.id)) ctx.addIssue({ code: 'custom', message: 'Identificador duplicado', path: [key, index] })
      ids.add(row.id)
    })
  }
  const assets = new Set(value.assets.map(row => row.ticker))
  for (const row of [...value.transactions, ...value.positions, ...value.wallet_income]) if (!assets.has(row.ticker)) ctx.addIssue({ code: 'custom', message: `Metadados ausentes: ${row.ticker}` })
  if (assets.size !== value.assets.length) ctx.addIssue({ code: 'custom', message: 'Ativo duplicado nos metadados' })
  const batches = new Set(value.transaction_import_batches.map(row => row.id))
  for (const row of value.transactions) if (row.import_batch_id != null && !batches.has(String(row.import_batch_id))) ctx.addIssue({ code: 'custom', message: 'Lançamento sem lote de importação correspondente' })
  const imports = new Set(value.wallet_income_imports.map(row => row.id))
  for (const row of value.wallet_income) if (typeof row.import_id !== 'string' || !imports.has(row.import_id)) ctx.addIssue({ code: 'custom', message: 'Recebimento sem origem de importação correspondente' })
  const lots = new Set(value.fixed_income_positions.map(row => row.id))
  for (const row of value.fixed_income_events) if (typeof row.position_id !== 'string' || !lots.has(row.position_id)) ctx.addIssue({ code: 'custom', message: 'Evento sem título correspondente' })
})
export type WalletBackup = z.infer<typeof backupSchema>
export function duplicateCounts(incoming: WalletBackup, current: WalletBackup) {
  return Object.fromEntries((['transactions', 'positions', 'fixed_income_positions', 'fixed_income_events', 'wallet_income', 'wallet_income_imports', 'transaction_import_batches'] as const).map(key => {
    const existing = new Set(current[key].map(row => row.id))
    return [key, incoming[key].filter(row => existing.has(row.id)).length]
  }))
}
