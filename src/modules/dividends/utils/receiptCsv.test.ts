import { expect, it } from 'vitest'
import { parseReceiptCsv, RECEIPT_HEADER } from './receiptCsv'
const line = 'nomad;credit-1;2026-11-09;MA;dividend;USD;0,06;0,02;0;0,04;;;'
const parse = (value = line) => parseReceiptCsv(RECEIPT_HEADER+'\n'+value,'2026-11-18')
it('preserva valores arredondados do extrato sem estimar quantidade, unidade ou câmbio', () => {
  const result = parse()
  expect(result.errors).toEqual([])
  expect(result.rows[0]).toMatchObject({ currency:'USD', gross_amount:'0.06000000', withholding_amount:'0.02000000', fees_amount:'0.00000000', net_amount:'0.04000000', quantity:null, value_per_share:null })
})
it('valida a conciliação exata sem tolerância de ponto flutuante', () => {
  expect(parse(line.replace('0,04','0,05')).errors[0]).toContain('exatamente')
  expect(parse(line.replace('0,06;0,02;0;0,04','0.3;0.1;0;0.2')).errors).toEqual([])
})
it.each(['1.000,00','1,000.00','-0.06','NaN','1e3','0.123456789'])('rejeita valor ambíguo ou fora da precisão: %s', amount=>{
  expect(parse(line.replace('0,06',amount)).errors.length).toBeGreaterThan(0)
})
it('rejeita data futura, data inexistente e referência duplicada', () => {
  expect(parse(line.replace('2026-11-09','2026-11-19')).errors).toHaveLength(1)
  expect(parse(line.replace('2026-11-09','2026-02-30')).errors).toHaveLength(1)
  expect(parse(line+'\n'+line).errors).toHaveLength(1)
})
it('aceita campos opcionais conhecidos e tipos BRL sem converter', () => {
  const result = parse(line.replace('MA;dividend;USD','ITSA3;jcp;BRL').replace(';;;',';2;0,03;'))
  expect(result.errors).toEqual([])
  expect(result.rows[0]).toMatchObject({ currency:'BRL', quantity:'2.00000000', value_per_share:'0.0300000000' })
})
it('não presume imposto ou tarifa zero quando o campo está vazio', () => {
  expect(parse(line.replace(';0,02;',';;')).errors).toHaveLength(1)
  expect(parse(line.replace(';0;',';;')).errors).toHaveLength(1)
})
it('preserva data COM informada e rejeita uma data posterior ao crédito', () => {
  expect(parse(line+'2026-11-01').rows[0]?.record_date).toBe('2026-11-01')
  expect(parse(line+'2026-11-10').errors).toHaveLength(1)
  expect(parse(line+'2026-02-30').errors).toHaveLength(1)
  expect(parse().rows[0]?.record_date).toBeNull()
})
it('não aceita cabeçalho repetido ou arquivo acima do limite', () => {
  expect(parseReceiptCsv(RECEIPT_HEADER+';bruto\n'+line+';1','2026-11-18').errors).toHaveLength(1)
  expect(parseReceiptCsv('a'.repeat(300001),'2026-11-18').errors).toHaveLength(1)
})
