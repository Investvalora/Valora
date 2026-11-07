import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ select: vi.fn(), replies: [] as unknown[] }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { from: () => ({ select: (columns: string) => {
  mocks.select(columns)
  return { in: () => ({ order: () => ({ order: async () => mocks.replies.shift() }) }) }
} }) } }))
import { fundamentalsService } from './fundamentalsService'
beforeEach(() => { mocks.select.mockClear(); mocks.replies.length = 0 })
it('preserva a consulta durante rollout sem a coluna opcional de proveniência', async () => {
  mocks.replies.push({ data: null, error: { code: '42703', message: 'column fundamentals.cvm_reference_date does not exist' } }, { data: [{ ticker: 'ABC', reference_date: '2026-11-07', vpa: 10 }], error: null })
  expect(await fundamentalsService.listByTickers(['ABC'])).toMatchObject([{ ticker: 'ABC', vpa: 10 }])
  expect(mocks.select).toHaveBeenCalledTimes(2)
  expect(mocks.select.mock.calls[1][0]).not.toContain('cvm_reference_date')
})
it('não oculta falha de autenticação nem repete erro de rede', async () => {
  const error = { code: '401', message: 'session invalid' }
  mocks.replies.push({ data: null, error })
  await expect(fundamentalsService.listByTickers(['ABC'])).rejects.toEqual(error)
  expect(mocks.select).toHaveBeenCalledTimes(1)
})
