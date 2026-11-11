import { expect, it } from 'vitest'
import { nasdaqAnnouncements, nasdaqIdentity } from '../../../supabase/functions/sync-international-announcements/nasdaq'
const asOf = '2026-11-11'
const row = { exOrEffDate: '11/12/2026', type: 'Cash', amount: '$0.27', declarationDate: '11/02/2026', recordDate: '11/12/2026', paymentDate: '11/16/2026', currency: 'USD' }
const payload = (rows: unknown[]) => ({ status: { rCode: 200 }, data: { exDividendDate: '08/10/2026', dividends: { rows } } })
const identity = { status: { rCode: 200 }, data: { symbol: 'AAPL', stockType: 'Common Stock', isNasdaqListed: true, assetClass: 'STOCKS' } }
it('usa linhas de anúncios futuros, ignorando resumo atrasado', () => {
  nasdaqIdentity(identity, 'AAPL')
  expect(nasdaqAnnouncements(payload([row]), asOf)).toEqual([{ ex_date: '2026-11-12', record_date: '2026-11-12', payment_date: '2026-11-16', declaration_date: '2026-11-02', value_per_share: 0.27 }])
})
it.each([{ symbol: 'MSFT' }, { stockType: 'Preferred Stock' }, { isNasdaqListed: false }, { assetClass: 'ETF' }])('recusa identidade incompatível %j', change => {
  expect(() => nasdaqIdentity({ ...identity, data: { ...identity.data, ...change } }, 'AAPL')).toThrow('identity')
})
it.each([{ amount: '$0.0000001' }, { currency: 'BRL' }, { type: 'Special' }, { paymentDate: '11/01/2026' }, { declarationDate: '11/12/2026' }, { recordDate: '02/30/2026' }])('recusa evento inválido %j', change => {
  expect(() => nasdaqAnnouncements(payload([{ ...row, ...change }]), asOf)).toThrow()
})
it('não soma distribuição ambígua na mesma data ex', () => {
  expect(() => nasdaqAnnouncements(payload([row, { ...row, amount: '$1.00' }]), asOf)).toThrow('ambiguous')
})
it('recusa data ex além da janela futura verificada', () => {
  expect(() => nasdaqAnnouncements(payload([{ ...row, exOrEffDate: '12/01/2027', recordDate: '12/01/2027', paymentDate: '12/02/2027' }]), asOf)).toThrow('invalid_event')
})
it('ignora história antiga não ajustada por split sem inventar datas ausentes', () => {
  expect(nasdaqAnnouncements(payload([row, { ...row, exOrEffDate: '11/21/1995', paymentDate: 'N/A' }]), asOf)).toHaveLength(1)
})
it.each([null, { status: { rCode: 500 } }, payload([]), payload(new Array(1001).fill(row))])('não considera payload sem cobertura como sucesso %j', data => {
  expect(() => nasdaqAnnouncements(data, asOf)).toThrow('unavailable')
})
