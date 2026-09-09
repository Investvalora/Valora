import { describe, expect, it } from 'vitest'
import {
  AMBIGUOUS_DECIMAL_MESSAGE,
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

/** `YYYY-MM-DD` deslocado em dias a partir de hoje, no fuso local. */
function isoDateFromToday(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

describe('parseDecimalPtBr', () => {
  it('normaliza decimal pt-BR: 10,50 vira 10.50', () => {
    expect(parseDecimalPtBr('10,50')).toBe(10.5)
  })

  it('trata ponto como separador de milhar quando existe vírgula', () => {
    expect(parseDecimalPtBr('1.234,56')).toBe(1234.56)
    expect(parseDecimalPtBr('1.234.567,89')).toBe(1234567.89)
    expect(parseDecimalPtBr('1.500,00')).toBe(1500)
  })

  it('aceita inteiro sem separador algum', () => {
    expect(parseDecimalPtBr('100')).toBe(100)
    expect(parseDecimalPtBr('1500')).toBe(1500)
  })

  it('aceita vírgula como único separador', () => {
    expect(parseDecimalPtBr('1500,5')).toBe(1500.5)
  })

  it('tolera espaço e prefixo de moeda', () => {
    expect(parseDecimalPtBr(' R$ 32,10 ')).toBe(32.1)
  })

  // Regra renegociada em 2026-09-08: ponto sem vírgula é ambíguo entre milhar e
  // decimal, e adivinhar erra por 1000× num valor financeiro. Recusa, não
  // palpite — nem para o lado do milhar.
  it.each(['1.500', '10.50', '12.345', '0.123', '1.500.000'])(
    'recusa ponto sem vírgula por ser ambíguo: %j',
    (raw) => {
      expect(Number.isNaN(parseDecimalPtBr(raw))).toBe(true)
    },
  )

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

  it.each([
    ['1.500,00', 1500],
    ['1500', 1500],
    ['1500,5', 1500.5],
    ['10,50', 10.5],
  ])('aceita %j e grava %d', (raw, expected) => {
    const values: PositionSchema = { ...VALID_FORM, averagePrice: raw }

    expect(positionSchema.safeParse(values).success).toBe(true)
    expect(toNewPosition(values).average_price).toBe(expected)
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

describe('positionSchema — ponto sem vírgula (linha da matriz)', () => {
  it.each(['1.500', '10.50', '12.345', '0.123'])(
    'quantidade %j é recusada com erro pedindo a vírgula',
    (raw) => {
      const values: PositionSchema = { ...VALID_FORM, quantity: raw }

      expect(positionSchema.safeParse(values).success).toBe(false)
      expect(fieldErrors(values, 'quantity')).toContain(AMBIGUOUS_DECIMAL_MESSAGE)
    },
  )

  it.each(['1.500', '10.50', '12.345', '0.123'])(
    'preço médio %j é recusado com erro pedindo a vírgula',
    (raw) => {
      const values: PositionSchema = { ...VALID_FORM, averagePrice: raw }

      expect(positionSchema.safeParse(values).success).toBe(false)
      expect(fieldErrors(values, 'averagePrice')).toContain(AMBIGUOUS_DECIMAL_MESSAGE)
    },
  )

  it('não confunde ambíguo com não numérico: a mensagem orienta o formato', () => {
    // Se `1.500` virasse 1,5 em silêncio, este teste passaria e o usuário
    // gravaria mil vezes menos. A distinção da mensagem é a garantia.
    expect(fieldErrors({ ...VALID_FORM, quantity: '1.500' }, 'quantity')).not.toContain(
      'Quantidade inválida. Use números, por exemplo 10,5',
    )
    expect(AMBIGUOUS_DECIMAL_MESSAGE).toContain('vírgula')
  })
})

describe('positionSchema — data de aquisição', () => {
  it('aceita hoje e uma data passada', () => {
    expect(
      positionSchema.safeParse({ ...VALID_FORM, acquisitionDate: isoDateFromToday(0) }).success,
    ).toBe(true)
    expect(
      positionSchema.safeParse({ ...VALID_FORM, acquisitionDate: isoDateFromToday(-1) }).success,
    ).toBe(true)
  })

  it.each([1, 30, 400])('recusa data %d dia(s) no futuro', (offset) => {
    const values: PositionSchema = { ...VALID_FORM, acquisitionDate: isoDateFromToday(offset) }

    expect(positionSchema.safeParse(values).success).toBe(false)
    expect(fieldErrors(values, 'acquisitionDate')).toContain(
      'Data de aquisição não pode estar no futuro',
    )
  })

  it('recusa data que não existe no calendário', () => {
    expect(fieldErrors({ ...VALID_FORM, acquisitionDate: '2026-02-30' }, 'acquisitionDate')).toContain(
      'Data inválida',
    )
  })
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
