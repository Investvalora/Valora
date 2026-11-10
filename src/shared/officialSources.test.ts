import { describe, expect, it } from 'vitest'

const filesPath = '../../supabase/functions/_shared/officialFiles.ts'
const reportsPath = '../../supabase/functions/sync-cvm-fii/reports.ts'
const macroPath = '../../supabase/functions/sync-macro-rates/validation.ts'
const { csvRecords, zipFiles, boundedBytes } = await import(filesPath)
const { fundReports } = await import(reportsPath)
const { macroRows } = await import(macroPath)
const issuerPath = '../../supabase/functions/sync-issuer-dividends/ishares.ts'
const { isharesDirectory, isharesDistributions } = await import(issuerPath)
const b3Path = '../../supabase/functions/sync-b3-dividends/announcements.ts'
const { b3Announcements } = await import(b3Path)

const general = 'CNPJ_Fundo_Classe;Data_Referencia;Versao;Codigo_ISIN;Data_Entrega\n00.332.266/0001-31;2026-01-01;2;BRFVPQCTF015;2026-03-17\n'
const complement = 'CNPJ_Fundo_Classe;Data_Referencia;Versao;Valor_Patrimonial_Cotas\n00.332.266/0001-31;2026-01-01;2;92.2101419138767\n'
describe('fontes oficiais', () => {
  it('deduplica informes idênticos e exclui VPA conflitante da mesma chave', () => {
    const repeated=complement+complement.split('\n')[1]+'\n'
    expect(fundReports(general,repeated,'official','2026-11-07')).toHaveLength(1)
    let conflicts=0
    const divergent=complement+complement.split('\n')[1].replace('92.2101419138767','93')+'\n'
    expect(fundReports(general,divergent,'official','2026-11-07',(n: number)=>{conflicts=n})).toHaveLength(0)
    expect(conflicts).toBe(1)
  })
  it('B3 associa somente ISIN exato e não troca data-com por data ex', () => {
    const row={isinCode:'BRPETRACNOR9',assetIssued:'BRPETRACNOR9',label:'JRS CAP PROPRIO',lastDatePrior:'21/08/2026',paymentDate:'23/11/2026',approvedOn:'06/08/2026',rate:'0,67407131000'}
    const result=b3Announcements([{cashDividends:[row]}],'PETR3','BRPETRACNOR9','official')
    expect(result[0]).toMatchObject({record_date:'2026-08-21',payment_date:'2026-11-23',value_per_share:0.67407131,type:'jcp'})
    expect(result[0]).not.toHaveProperty('ex_date')
    expect(b3Announcements([{cashDividends:[row]}],'PETR4','BRPETRACNPR6','official')).toEqual([])
    expect(b3Announcements([{cashDividends:[{...row,paymentDate:'A DEFINIR'}]}],'PETR3','BRPETRACNOR9','official')).toEqual([])
    expect(()=>b3Announcements([{cashDividends:[{...row,rate:'0,67 lixo'}]}],'PETR3','BRPETRACNOR9','official')).toThrow()
  })
  it('descobre fundos pelo catálogo do gestor e rejeita ticker ambíguo', () => {
    const html='<a href="/us/products/123/fund-one">ABC</a><a href="/us/products/124/fund-two">DEF</a><a href="/us/products/125/fund-three">DEF</a>'
    expect([...isharesDirectory(html)]).toEqual([['ABC','https://www.ishares.com/us/products/123/fund-one']])
  })
  it('recusa identidade diferente ou tabela alterada do gestor', () => {
    expect(() => isharesDistributions('<title>iShares Fund | OTHER</title>', 'TFLO')).toThrow('issuer_identity_mismatch')
    expect(() => isharesDistributions('<title>iShares Fund | TFLO</title><table></table>', 'TFLO')).toThrow('issuer_schema_changed')
  })
  it('mantém data ex, registro, pagamento e valor bruto separados', () => {
    const cell=(name:string,value:string)=>`<td class="_ws-col${name}">${value}</td>`
    const html='<title>iShares Fund | ABC</title><table><thead>Record Date Ex-Date Payable Date Total Distribution</thead><tr>'+cell('RecordDate','Nov 03, 2026')+cell('ExDate','Nov 02, 2026')+cell('PayableDate','Nov 05, 2026')+cell('TotalDistribution','$0.171627')+'</tr></table>'
    expect(isharesDistributions(html,'ABC')[0]).toMatchObject({ex_date:'2026-11-02',record_date:'2026-11-03',payment_date:'2026-11-05',value_per_share:0.171627})
    expect(() => isharesDistributions(html.replace('$0.171627','€0.171627'),'ABC')).toThrow('issuer_invalid_amount')
  })
  it('interpreta CSV com campo delimitado, aspas e quebra interna', () => {
    expect(csvRecords('a;b\n"texto;com\nlinha";"uma ""aspa"""\n')).toEqual([{ a: 'texto;com\nlinha', b: 'uma "aspa"' }])
    expect(() => csvRecords('a;b\n"aberto')).toThrow()
    expect(() => csvRecords('a;b\n1;2;3')).toThrow()
  })
  it('associa informe por CNPJ, competência e versão exatos e preserva precisão', () => {
    expect(fundReports(general, complement, 'official', '2026-11-07')).toEqual([expect.objectContaining({ cnpj: '00332266000131', isin: 'BRFVPQCTF015', vpa: 92.2101419138767, delivered_at: '2026-03-17' })])
    expect(() => fundReports(general, complement.replace(';2;', ';1;'), 'official', '2026-11-07')).toThrow('cvm_no_valid_reports')
  })
  it('recusa schema alterado, VPA inválido ou informação entregue no futuro', () => {
    expect(() => fundReports(general.replace('Codigo_ISIN', 'ticker'), complement, 'official', '2026-11-07')).toThrow('cvm_schema_changed')
    expect(() => fundReports(general, complement.replace('92.2101419138767', 'NaN'), 'official', '2026-11-07')).toThrow()
    expect(() => fundReports(general, complement, 'official', '2026-03-01')).toThrow()
  })
  it('limita o download mesmo sem Content-Length', async () => {
    await expect(boundedBytes(new Response('12345'), 4)).rejects.toThrow('official_source_too_large')
    await expect(boundedBytes(new Response(null, { status: 503 }))).rejects.toThrow()
  })
  it('recusa ZIP inválido ou truncado', async () => {
    await expect(zipFiles(new Uint8Array(30), () => true)).rejects.toThrow('invalid_zip')
    await expect(zipFiles(new Uint8Array(2), () => true)).rejects.toThrow()
  })
  it('não converte taxa inválida em uma série aparentemente completa', () => {
    expect(macroRows([{ data: '05/11/2026', valor: '13.65' }], 'cdi', '2026-11-07')).toEqual([{ series: 'cdi', date: '2026-11-05', value: 13.65 }])
    expect(macroRows([{ data: '01/09/2026', valor: '-0.2' }], 'ipca', '2026-11-07')[0].value).toBe(-0.2)
    for (const entry of [{ data: '31/02/2026', valor: '1' }, { data: '08/11/2026', valor: '1' }, { data: '05/11/2026', valor: '13.65%' }, { data: '05/11/2026', valor: '-1' }]) {
      expect(() => macroRows([entry], 'cdi', '2026-11-07')).toThrow('invalid_macro_entry')
    }
  })
})
