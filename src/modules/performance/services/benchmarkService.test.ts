import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})
import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { benchmarkService } from './benchmarkService'
import { dividendService } from '../../dividends/services/dividendService'

beforeEach(resetSupabaseMock)

it('busca benchmarks além de mil registros sem perder o fim do período', async () => {
  const rows = Array.from({ length: 1001 }, (_, value) => ({ name: 'CDI', date: `date-${value}`, value, source: 'test' }))
  supabaseMock.on('benchmarks', ({ calls }) => {
    const [from, to] = calls.find((call) => call.method === 'range')!.args as [number, number]
    return { data: rows.slice(from, to + 1), error: null }
  })
  expect(await benchmarkService.listBenchmarks('2020-01-01')).toEqual(rows)
  expect(supabaseMock.chains).toHaveLength(3)
})

it('rentabilidade pode buscar todos os proventos preservando o limite padrão dos outros consumidores', async () => {
  const rows = Array.from({ length: 501 }, (_, value_per_share) => ({ ticker: 'AAA3', type: 'dividend', ex_date: '2020-01-01', payment_date: '2020-01-10', value_per_share }))
  supabaseMock.on('dividends', ({ calls }) => {
    const range = calls.find((call) => call.method === 'range')?.args as [number, number] | undefined
    return { data: range ? rows.slice(range[0], range[1] + 1) : rows.slice(0, 500), error: null }
  })
  expect(await dividendService.listDividendsByTickers(['AAA3'], '2020-01-01', true)).toHaveLength(501)
  expect(await dividendService.listDividendsByTickers(['AAA3'], '2020-01-01')).toHaveLength(500)
})

it('propaga erro de página posterior em vez de retornar resultado truncado', async () => {
  const error = { message: 'página indisponível' }
  for (const table of ['benchmarks', 'dividends']) {
    supabaseMock.on(table, ({ calls }) => {
      const [from] = calls.find((call) => call.method === 'range')!.args as [number]
      return from === 0 ? { data: Array(500).fill({}), error: null } : { data: null, error }
    })
  }
  await expect(benchmarkService.listBenchmarks('2020-01-01')).rejects.toBe(error)
  await expect(dividendService.listDividendsByTickers(['AAA3'], '2020-01-01', true)).rejects.toBe(error)
})
