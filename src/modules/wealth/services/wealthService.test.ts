import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})
import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { wealthService } from './wealthService'

beforeEach(resetSupabaseMock)

it('busca além do limite padrão do PostgREST sem perder o fechamento mensal mais recente', async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => ({ ticker: `ASSET${i}`, date: '2026-09-30', close: i + 1 }))
  supabaseMock.on('price_history', ({ calls }) => {
    const range = calls.find((call) => call.method === 'range')!.args as [number, number]
    return { data: rows.slice(range[0], range[1] + 1), error: null }
  })
  const result = await wealthService.listPriceHistory(['BR'], '2026-09-01')
  expect(result).toEqual(rows)
  expect(result[result.length - 1]?.close).toBe(1001)
  expect(supabaseMock.chains).toHaveLength(3)
})

it('propaga falha de uma página sem entregar um histórico truncado', async () => {
  const error = { message: 'falha no histórico' }
  supabaseMock.on('price_history', () => ({ data: null, error }))
  await expect(wealthService.listPriceHistory(['BR'], '2026-09-01')).rejects.toBe(error)
})
