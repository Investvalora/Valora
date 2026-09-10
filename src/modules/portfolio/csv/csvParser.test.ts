import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_ROWS, MAX_PREVIEW_ROWS, parseCsvTransactions } from './csvParser'

const header = 'data;ticker;tipo;quantidade;preço;corretagem'

describe('parseCsvTransactions', () => {
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