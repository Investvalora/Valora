import { beforeEach, expect, it, vi } from 'vitest'
import { fixedIncomeService } from './fixedIncomeService'
const from = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { from } }))
beforeEach(() => vi.clearAllMocks())

it('exibe principal restante nas posições atuais sem alterar o principal original do histórico', async () => {
  const row = { principal: 1000, remaining_principal: 400 }
  const query = { select: () => query, eq: () => query, order: async () => ({ data: [row], error: null }) }
  from.mockReturnValue(query)
  expect((await fixedIncomeService.listPositions('user', 'wallet'))[0].principal).toBe(400)
  expect(row.principal).toBe(1000)
})

it('repetição após resposta perdida reconhece somente o mesmo evento com o mesmo conteúdo', async () => {
  const event = { id: 'event', position_id: 'p', type: 'redemption' as const, event_date: '2026-10-01', amount: 420, principal_redeemed: 400, balance_after: 0 }
  const duplicate = { code: '23505' }
  const lookup = { select: () => lookup, eq: () => lookup, maybeSingle: async () => ({ data: event, error: null }) }
  from.mockReturnValueOnce({ insert: async () => ({ error: duplicate }) }).mockReturnValueOnce(lookup)
  await expect(fixedIncomeService.addEvent(event)).resolves.toBeUndefined()
  from.mockReturnValueOnce({ insert: async () => ({ error: duplicate }) }).mockReturnValueOnce(lookup)
  await expect(fixedIncomeService.addEvent({ ...event, amount: 500 })).rejects.toEqual(duplicate)
})
