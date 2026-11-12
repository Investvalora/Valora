import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { supabaseMock } from '../../../test/supabaseMock'
import { dividendService } from './dividendService'
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: supabaseMock.client }))
beforeEach(() => supabaseMock.reset())
afterEach(() => vi.useRealTimers())
it('includes a confirmed SEC special only in personal cashflow, once, without changing the recurring dividend table', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T12:00:00Z'))
  const special={ticker:'COST',confirmed_ex_date:'2026-11-24',record_date:'2026-11-24',payment_date:'2026-12-04',value_per_share:30}
  supabaseMock.on('sec_dividend_announcements',()=>({data:[special],error:null}))
  expect(await dividendService.listDividendsByTickers(['COST'],'2026-01-01',true,'announced','2027-01-01')).toEqual([{ticker:'COST',type:'dividend',ex_date:'2026-11-24',record_date:'2026-11-24',payment_date:'2026-12-04',value_per_share:30,is_special:true}])
  expect(supabaseMock.chains.find(c=>c.table==='sec_dividend_announcements')?.calls).toContainEqual({method:'eq',args:['distribution','special']})
  expect(supabaseMock.chains.every(c=>c.calls.every(x=>!['insert','update','upsert'].includes(x.method)))).toBe(true)
})
it('consulta parcelas B3 e a data ex real mesmo quando o agregado não entrou na consulta de pagos', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T12:00:00Z'))
  const anchor = { ticker: 'KLBN4', type: 'dividend', ex_date: '2025-12-16', payment_date: null, value_per_share: 0.180583 }
  supabaseMock.on('dividends', chain => ({ data: chain.calls.some(call => call.method === 'or') ? [] : [anchor], error: null }))
  supabaseMock.on('b3_cash_announcements', () => ({ data: ['2026-02-27','2026-05-20','2026-08-19','2026-11-12'].map(payment_date => ({ ticker: 'KLBN4', type: 'dividend', record_date: '2025-12-15', payment_date, value_per_share: 0.04559717224 })), error: null }))
  const paid = await dividendService.listDividendsByTickers(['KLBN4'], '2026-11-01', true)
  expect(paid).toEqual([{ ...anchor, record_date: '2025-12-15', payment_date: '2026-11-12', value_per_share: 0.04559717224, is_installment: true }])
  expect(await dividendService.listDividendsByTickers(['KLBN4'], '2026-11-01', true, 'announced')).toEqual([])
  for (const chain of supabaseMock.chains.filter(chain => chain.table === 'dividends')) {
    expect(chain.calls).toContainEqual({ method: 'not', args: ['source', 'in', '(seed,synthetic)'] })
  }
})
it('pagos exigem data de pagamento e não misturam anúncios sem data', async () => {
  supabaseMock.on('dividends', () => ({ data: [], error: null }))
  await dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true)
  const filter = supabaseMock.chains[0].calls.find((call) => call.method === 'or')?.args[0] as string
  expect(filter).toContain('payment_date.gte.2026-01-01')
  expect(filter).toContain('payment_date.lte.')
  expect(filter).not.toContain('payment_date.is.null')
  expect(supabaseMock.chains[0].calls).toContainEqual({ method: 'not', args: ['source', 'in', '(seed,synthetic)'] })
})
it('anúncios incluem pagamentos futuros e datas a definir até o horizonte', async () => {
  supabaseMock.on('dividends', () => ({ data: [], error: null }))
  await dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true, 'announced', '2027-01-01')
  const filter = supabaseMock.chains[0].calls.find((call) => call.method === 'or')?.args[0] as string
  expect(filter).toContain('payment_date.gt.')
  expect(filter).toContain('payment_date.is.null')
  expect(filter).toContain('payment_date.lte.2027-01-01')
  expect(supabaseMock.chains[0].calls).toContainEqual({ method: 'not', args: ['source', 'in', '(seed,synthetic)'] })
})
it('propaga erro em vez de devolver ausência de proventos', async () => {
  supabaseMock.on('dividends', () => ({ data: null, error: new Error('offline') }))
  await expect(dividendService.listDividendsByTickers(['AAA3'], '2026-01-01', true, 'paid')).rejects.toThrow('offline')
})
