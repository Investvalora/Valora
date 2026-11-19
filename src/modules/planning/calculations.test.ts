import { describe, expect, it } from 'vitest'
import { planContribution, backupSchema, duplicateCounts } from './calculations'
const owner = '11111111-1111-4111-8111-111111111111'
const wallet = '22222222-2222-4222-8222-222222222222'
const backup = () => ({ format: 'valora-wallet', version: 1, decimal_encoding: 'exact-string', fixed_income_currency: 'BRL', exported_at: '2026-11-19T16:00:00+00:00', wallet: { id: wallet, user_id: owner, name: 'Teste' }, transactions: [], positions: [], fixed_income_positions: [], fixed_income_events: [], wallet_income: [], wallet_income_imports: [], transaction_import_batches: [], assets: [] })
describe('planejamento', () => {
  it('destina aporte às classes abaixo da meta sem simular vendas', () => {
    expect(planContribution(100, { stock_br: 100 }, { stock_br: 50, fii: 50 }, 0)).toEqual({ rows: [{ type: 'stock_br', amount: 0 }, { type: 'fii', amount: 100 }], remainder: 0 })
  })
  it('devolve o mínimo não alocado ao caixa e conserva cada centavo', () => {
    expect(planContribution(100.01, {}, { stock_br: 50, fii: 50 }, 60)?.remainder).toBe(100.01)
    const plan = planContribution(100.01, {}, { stock_br: 33.33, fii: 33.33, bdr: 33.34 }, 0)!
    expect(Math.round((plan.rows.reduce((sum, row) => sum + row.amount, 0) + plan.remainder) * 100)).toBe(10001)
  })
  it('recusa metas parciais, valores inválidos e patrimônio desconhecido', () => {
    expect(planContribution(100, {}, { stock_br: 90 }, 0)).toBeNull()
    expect(planContribution(NaN, {}, { stock_br: 100 }, 0)).toBeNull()
    expect(planContribution(100, { stock_br: NaN }, { stock_br: 100 }, 0)).toBeNull()
  })
})
describe('exportação portável', () => {
  it('valida versão e detecta IDs já presentes', () => {
    const data = backupSchema.parse(backup())
    expect(Object.values(duplicateCounts(data, data)).every(value => value === 0)).toBe(true)
    expect(backupSchema.safeParse({ ...backup(), version: 2 }).success).toBe(false)
  })
  it('recusa registros de outra carteira, duplicados e eventos órfãos', () => {
    const row = { id: owner, user_id: owner, wallet_id: owner, ticker: 'PETR4', quantity: 1 }
    expect(backupSchema.safeParse({ ...backup(), positions: [row] }).success).toBe(false)
    const lot = { id: owner, user_id: owner, wallet_id: wallet }
    expect(backupSchema.safeParse({ ...backup(), fixed_income_positions: [lot, lot] }).success).toBe(false)
    expect(backupSchema.safeParse({ ...backup(), fixed_income_events: [{ ...lot, position_id: wallet }] }).success).toBe(false)
  })
})

it('preserva texto decimal exato na exportação, sem conversão para Number', () => {
  const row = { id: owner, user_id: owner, wallet_id: wallet, ticker: 'AAPL', type: 'buy', quantity: '9999999999.00000001', price: '12.3456', transaction_date: '2026-01-01' }
  const parsed = backupSchema.parse({ ...backup(), transactions: [row], assets: [{ ticker: 'AAPL', currency: 'USD', type: 'stock_us' }] })
  expect(parsed.transactions[0].quantity).toBe('9999999999.00000001')
  expect(duplicateCounts(parsed, parsed).transactions).toBe(1)
})

it('exporta renda fixa de liquidez diária sem exigir vencimento inexistente', () => {
  const lot = { id: owner, user_id: owner, wallet_id: wallet, name: 'CDB diário', principal: '100.0000', application_date: '2026-01-01', maturity_date: null, active: true }
  expect(backupSchema.parse({ ...backup(), fixed_income_positions: [lot] }).fixed_income_positions[0].maturity_date).toBeNull()
})
