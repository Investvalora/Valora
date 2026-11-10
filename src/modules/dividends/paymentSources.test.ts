import { describe, expect, it } from 'vitest'
import { fnetDocumentIds, fnetPayment, mastercardPayments } from '../../../supabase/functions/sync-dividend-payments/parsers'
import gare from './fixtures/fnet-gare.html?raw'
import vghf from './fixtures/fnet-vghf.html?raw'

const source = (id: number) => `https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=${id}`
const identity = { ticker: 'GARE11', cnpj: '37295919000160', isin: 'BRGARECTF001' }
describe('payment date sources', () => {
  it('lê os avisos reais FNET com identidade e datas exatas, sem criar ex-date', () => {
    expect(fnetPayment(gare, identity, source(1365436))).toEqual({ record_date: '2026-10-30', payment_date: '2026-11-09', value_per_share: 0.083, source_url: source(1365436) })
    expect(fnetPayment(vghf, { ticker: 'VGHF11', cnpj: '36771692000119', isin: 'BRVGHFCTF005' }, source(1365431)).value_per_share).toBe(0.05)
  })
  it('rejeita identidade diferente, valores inválidos, amortização e esquema alterado', () => {
    expect(() => fnetPayment(vghf, identity, source(1))).toThrow()
    expect(() => fnetPayment(gare, { ...identity, cnpj: '00000000000000' }, source(1))).toThrow()
    expect(() => fnetPayment(gare.replace('0,083', 'NaN'), identity, source(1))).toThrow()
    expect(() => fnetPayment(gare.replace('09/11/2026', '31/02/2026'), identity, source(1))).toThrow()
    expect(() => fnetPayment(gare.replace('<td></td>', '<td>0,02</td>'), identity, source(1))).toThrow()
    expect(() => fnetPayment(gare, identity, 'https://other.test/document')).toThrow()
  })
  it('seleciona somente avisos ativos de rendimentos, sem confundir relatório gerencial', () => {
    const notice = { id: 1365436, status: 'AC', tipoDocumento: 'Rendimentos e Amortizações', categoriaDocumento: 'Aviso aos Cotistas - Estruturado' }
    expect(fnetDocumentIds({ recordsFiltered: 3, data: [notice, { ...notice, id: 2, status: 'CC' }, { ...notice, id: 3, tipoDocumento: 'Relatório Gerencial' }] })).toEqual({ ids: [1365436], total: 3 })
    expect(() => fnetDocumentIds({ data: [] })).toThrow()
  })
  it('lê a tabela de declaração/record/pagamento da Mastercard sem chamar record de ex', () => {
    // Minimal fixture of the official table verified on 10/11; direct fetch is currently 403.
    const html = '<title>Mastercard Incorporated - Dividend History</title><table><tr><th>Declared</th><th>Record</th><th>Payable</th><th>Amount</th><th>Type</th></tr><tr><td>09/29/26</td><td>10/09/26</td><td>11/09/26</td><td>$0.87</td><td>Regular Cash</td></tr></table>'
    expect(mastercardPayments(html)[0]).toMatchObject({ record_date: '2026-10-09', payment_date: '2026-11-09', value_per_share: 0.87 })
    expect(mastercardPayments(html)[0]).not.toHaveProperty('ex_date')
    expect(() => mastercardPayments(html.replace('Regular Cash', 'Stock Dividend'))).toThrow()
    expect(() => mastercardPayments(html.replace('Mastercard', 'Other'))).toThrow()
  })
})
