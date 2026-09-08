import { describe, expect, it } from 'vitest'
import {
  parseDecimalPtBr,
  positionSchema,
  toNewPosition,
  type PositionSchema,
} from './positionSchema'

/** Formulário válido; cada teste troca só o campo que investiga. */
const VALID_FORM: PositionSchema = {
  ticker: 'PETR4',
  quantity: '100',
  averagePrice: '32,10',
  acquisitionDate: '2026-01-15',
}

/** Todas as mensagens de erro do campo, ou `[]` quando o parse passa. */
function fieldErrors(values: PositionSchema, field: keyof PositionSchema): string[] {
  const result = positionSchema.safeParse(values)
  if (result.success) return []

  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message)
}

describe('parseDecimalPtBr', () => {
  it('normaliza decimal pt-BR: 10,50 vira 10.50', () => {
    expect(parseDecimalPtBr('10,50')).toBe(10.5)
  })

  it('trata ponto como separador de milhar quando existe vírgula', () => {
    expect(parseDecimalPtBr('1.234,56')).toBe(1234.56)
    expect(parseDecimalPtBr('1.234.567,89')).toBe(1234567.89)
  })

  it('mantém o ponto como separador decimal quando não há vírgula', () => {
    expect(parseDecimalPtBr('10.50')).toBe(10.5)
    expect(parseDecimalPtBr('100')).toBe(100)
  })

  it('tolera espaço e prefixo de moeda', () => {
    expect(parseDecimalPtBr(' R$ 32,10 ')).toBe(32.1)
  })

  it.each(['abc', 'dez reais', '1e3', '10,5,5', '1..2', '', '   ', '10a'])(
    'devolve NaN para entrada não numérica: %j',
    (raw) => {
      expect(Number.isNaN(parseDecimalPtBr(raw))).toBe(true)
    },
  )
})

describe('positionSchema — decimal pt-BR (linha da matriz)', () => {
  it('aceita 10,50 e entrega 10.50 no payload de escrita', () => {
    const values: PositionSchema = { ...VALID_FORM, quantity: '10,50', averagePrice: '1.234,56' }

    expect(positionSchema.safeParse(values).success).toBe(true)
    expect(toNewPosition(values)).toEqual({
      ticker: 'PETR4',
      quantity: 10.5,
      average_price: 1234.56,
      acquisition_date: '2026-01-15',
    })
  })

  it('normaliza o preço médio antes de enviar', () => {
    expect(toNewPosition({ ...VALID_FORM, averagePrice: '32,10' }).average_price).toBe(32.1)
  })

  it.each(['abc', 'dez', '1e3', '10,5,5', ''])(
    'quantidade não numérica %j vira erro de campo',
    (raw) => {
      expect(fieldErrors({ ...VALID_FORM, quantity: raw }, 'quantity')).toContain(
        'Quantidade inválida. Use números, por exemplo 10,5',
      )
    },
  )

  it.each(['trinta e dois', 'R$', '3,2,1'])(
    'preço médio não numérico %j vira erro de campo',
    (raw) => {
      expect(fieldErrors({ ...VALID_FORM, averagePrice: raw }, 'averagePrice')).toContain(
        'Preço médio inválido. Use números, por exemplo 32,10',
      )
    },
  )
})

describe('positionSchema — quantidade inválida (linha da matriz)', () => {
  it.each(['0', '-5', '0,00', '-0,5'])('rejeita quantidade %j', (raw) => {
    const values: PositionSchema = { ...VALID_FORM, quantity: raw }

    expect(positionSchema.safeParse(values).success).toBe(false)
    expect(fieldErrors(values, 'quantity')).toContain('Quantidade deve ser maior que zero')
  })

  it('aceita quantidade fracionária positiva', () => {
    expect(positionSchema.safeParse({ ...VALID_FORM, quantity: '0,5' }).success).toBe(true)
  })

  it('aceita preço médio zero e rejeita negativo', () => {
    expect(positionSchema.safeParse({ ...VALID_FORM, averagePrice: '0' }).success).toBe(true)
    expect(fieldErrors({ ...VALID_FORM, averagePrice: '-1' }, 'averagePrice')).toContain(
      'Preço médio não pode ser negativo',
    )
  })
})
