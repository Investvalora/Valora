import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_ROWS, MAX_PREVIEW_ROWS, parseCsvTransactions } from './csvParser'
import { parseDecimalPtBr } from '../schemas/positionSchema'

const header = 'data;ticker;tipo;quantidade;preço;corretagem'

describe('parseCsvTransactions', () => {
  it('normaliza ponto decimal explicitamente escolhido sem perder casas ou mudar a escala', () => {
    const result = parseCsvTransactions(`${header}\n2026-09-15;AAPL;buy;0.06610000;302.60000000;0\n2026-09-15;BBAS3;buy;46.00000000;21.07000000;0`, 'decimal-point')
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toMatchObject({ quantity: '0,06610000', price: '302,60000000' })
    expect(parseDecimalPtBr(result.rows[0].quantity)).toBe(0.0661)
    expect(parseDecimalPtBr(result.rows[1].quantity)).toBe(46)
  })

  it('não adivinha a convenção de um ponto isolado', () => {
    const csv = `${header}\n2026-01-05;TEST;buy;1.500;10;0`
    expect(parseCsvTransactions(csv).errors).toEqual(expect.arrayContaining([expect.objectContaining({ column: 'quantidade' })]))
    expect(parseCsvTransactions(csv, 'decimal-point').rows[0].quantity).toBe('1,500')
  })

  it.each(['1,500', '1.234,56', '1,234.56', '1e3', 'NaN'])('bloqueia formato incompatível %s sem convertê-lo silenciosamente', value => {
    const result = parseCsvTransactions(`${header}\n2026-01-05;TEST;buy;${value};10;0`, 'decimal-point')
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0]).toMatchObject({ row: 2, column: 'quantidade' })
  })

  it('mantém precisão de cripto, rejeita zero/negativo e aceita CSV separado por vírgula', () => {
    const csv = 'data,ticker,tipo,quantidade,preço,corretagem\n2026-01-05,TEST,buy,0.00000001,1234.56,0.01'
    const result = parseCsvTransactions(csv, 'decimal-point')
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toMatchObject({ quantity: '0,00000001', price: '1234,56', brokerageFee: '0,01' })
    for (const quantity of ['0', '-0.01']) {
      expect(parseCsvTransactions(`${header}\n2026-01-05;TEST;buy;${quantity};10;0`, 'decimal-point').errors[0].column).toBe('quantidade')
    }
  })
  it('aceita BOM UTF-8, separador brasileiro e decimais com virgula', () => {
    const result = parseCsvTransactions(`\uFEFF${header}\n10/09/2026;PETR4;buy;1.000,5;32,10;0,50`)

    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toMatchObject({
      ticker: 'PETR4',
      quantity: '1.000,5',
      price: '32,10',
      brokerageFee: '0,50',
      date: '2026-09-10',
    })
  })

  it('decodifica Windows-1252 e preserva acentos do cabecalho', () => {
    const windows1252 = `${header}\n10/09/2026;PETR4;buy;1;32,10;0,50`
    const bytes = Uint8Array.from([...windows1252].map((character) => (character === 'ç' ? 0xe7 : character.charCodeAt(0))))
    const result = parseCsvTransactions(bytes.buffer)

    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(1)
  })

  it('rejeita arquivo acima do limite antes de produzir preview', () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => '10/09/2026;PETR4;buy;1;1;0')
    const result = parseCsvTransactions([header, ...rows].join('\n'))

    expect(result.totalRows).toBe(MAX_IMPORT_ROWS + 1)
    expect(result.rows).toHaveLength(0)
    expect(result.previewRows).toBe(0)
    expect(result.errors[0]).toMatchObject({ column: 'arquivo' })
  })

  it('aceita exatamente 1000 linhas sem truncar o lote', () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS }, () => '10/09/2026;PETR4;buy;1;1;0')
    const result = parseCsvTransactions([header, ...rows].join('\n'))
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(1000)
    expect(result.previewRows).toBe(MAX_PREVIEW_ROWS)
  })

  it('impede arredondamento silencioso e estouro da quantidade no banco', () => {
    for (const quantity of ['0.000000001', '1.123456789', '10000000000']) {
      const result = parseCsvTransactions(`${header}\n2026-01-05;TEST;buy;${quantity};10;0`, 'decimal-point')
      expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ column: 'quantidade' })]))
      expect(result.rows[0].selected).toBe(false)
    }
    expect(parseCsvTransactions(`${header}\n2026-01-05;TEST;buy;0.0661000000;10;0`, 'decimal-point').errors).toHaveLength(0)
  })

  it('impede perda de precisão em preço e corretagem', () => {
    const result = parseCsvTransactions(`${header}\n2026-01-05;TEST;buy;1;10.12345;0.00001`, 'decimal-point')
    expect(result.errors.map(issue => issue.column)).toEqual(['preço', 'corretagem'])
  })

  it('informa linha, coluna, problema e exemplo para uma linha invalida', () => {
    const result = parseCsvTransactions(`${header}\n10/09/2026;PETR4;invalid;0;abc;0`)

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, column: 'tipo', example: expect.any(String) }),
      expect.objectContaining({ row: 2, column: 'quantidade', example: expect.any(String) }),
      expect.objectContaining({ row: 2, column: 'preço', example: expect.any(String) }),
    ]))
  })

  it('trata data de calendario invalida como erro localizado', () => {
    const result = parseCsvTransactions(`${header}\n31/02/2026;PETR4;buy;1;10;0`)

    expect(result.errors[0]).toMatchObject({ row: 2, column: 'data' })
  })

  it('limita a quantidade exibida no preview', () => {
    const rows = Array.from({ length: MAX_PREVIEW_ROWS + 1 }, () => '10/09/2026;PETR4;buy;1;1;0')
    const result = parseCsvTransactions([header, ...rows].join('\n'))

    expect(result.rows).toHaveLength(MAX_PREVIEW_ROWS + 1)
    expect(result.previewRows).toBe(MAX_PREVIEW_ROWS)
  })
})
