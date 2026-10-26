import { beforeEach, expect, it, vi } from 'vitest'
import { supabaseMock } from '../../../test/supabaseMock'
import { dividendService } from './dividendService'
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: supabaseMock.client }))
beforeEach(() => supabaseMock.reset())
it('pagos exigem data de pagamento e não misturam anúncios sem data', async () => {
  supabaseMock.on('dividends', () => ({ data: [], error: null }))
  await dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true)
  const filter = supabaseMock.chains[0].calls.find((call) => call.method === 'or')?.args[0] as string
  expect(filter).toContain('payment_date.gte.2026-01-01')
  expect(filter).toContain('payment_date.lte.')
  expect(filter).not.toContain('payment_date.is.null')
})
it('anúncios incluem pagamentos futuros e datas a definir até o horizonte', async () => {
  supabaseMock.on('dividends', () => ({ data: [], error: null }))
  await dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true, 'announced', '2027-01-01')
  const filter = supabaseMock.chains[0].calls.find((call) => call.method === 'or')?.args[0] as string
  expect(filter).toContain('payment_date.gt.')
  expect(filter).toContain('payment_date.is.null')
  expect(filter).toContain('payment_date.lte.2027-01-01')
})
it('propaga erro em vez de devolver ausência de proventos', async () => {
  supabaseMock.on('dividends', () => ({ data: null, error: new Error('offline') }))
  await expect(dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true, 'paid')).rejects.toThrow('offline')
})
