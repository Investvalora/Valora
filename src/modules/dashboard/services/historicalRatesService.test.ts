import { afterEach, expect, it, vi } from 'vitest'
import { historicalRatesService } from './historicalRatesService'

const range = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { from: () => { const query = { select: () => query, gte: () => query, lte: () => query, order: () => query, range }; return query } } }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

it('pagina PTAX e escolhe o último boletim válido de cada dia', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ value: Array.from({ length: 500 }, () => ({ dataHoraCotacao: '2026-09-01 10:00:00', cotacaoVenda: 5 })) }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ value: [{ dataHoraCotacao: '2026-09-01 13:00:00', cotacaoVenda: 5.2 }, { dataHoraCotacao: '2026-09-02 13:00:00', cotacaoVenda: -1 }, { dataHoraCotacao: '2026-10-01 13:00:00', cotacaoVenda: 100 }] }) })
  vi.stubGlobal('fetch', fetchMock)
  expect(await historicalRatesService.usd('2026-09-01', '2026-09-30')).toEqual([{ date: '2026-09-01', value: 5.2 }])
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('$skip')).toBe('500')
  expect(fetchMock.mock.calls[0][0]).toContain('dataHoraCotacao%20asc')
})

it('falha explícita no provedor não se transforma em câmbio atual', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
  await expect(historicalRatesService.usd('2026-09-01', '2026-09-30')).rejects.toThrow('503')
})

it('pagina macro_rates além do limite padrão do servidor e propaga falhas', async () => {
  const row = { series: 'cdi', date: '2026-09-01', value: 10 }
  range.mockResolvedValueOnce({ data: Array(500).fill(row), error: null }).mockResolvedValueOnce({ data: [row], error: null })
  expect(await historicalRatesService.macro('2026-01-01', '2026-09-30')).toHaveLength(501)
  expect(range).toHaveBeenNthCalledWith(2, 500, 999)
  range.mockResolvedValueOnce({ error: new Error('offline') })
  await expect(historicalRatesService.macro('2026-01-01', '2026-09-30')).rejects.toThrow('offline')
})
