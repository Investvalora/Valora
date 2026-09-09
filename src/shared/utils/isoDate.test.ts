import { describe, expect, it } from 'vitest'
import { businessDaysBetween, isoDaysBetween, parseIsoDate, shiftIsoDate, toIsoDate } from './isoDate'

describe('isoDate — premissa do runner', () => {
  /**
   * Todo este módulo existe por causa do fuso negativo. Num runner UTC as
   * asserções abaixo passariam mesmo com a implementação ingênua, então a
   * premissa é verificada antes.
   */
  it('roda em America/Sao_Paulo (UTC-3)', () => {
    expect(new Date().getTimezoneOffset()).toBe(180)
    expect(new Date('2026-01-05').getDate()).toBe(4)
  })
})

describe('parseIsoDate', () => {
  it('lê a data como dia local, sem deslocar', () => {
    const parsed = parseIsoDate('2026-01-05')

    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(0)
    expect(parsed?.getDate()).toBe(5)
  })

  it('rejeita data inexistente em vez de rolar para o mês seguinte', () => {
    // `new Date(2026, 1, 31)` vira 03/03 em silêncio.
    expect(parseIsoDate('2026-02-31')).toBeNull()
  })

  it.each(['', 'sem data', '05/01/2026', '2026-1-5'])('rejeita %j', (value) => {
    expect(parseIsoDate(value)).toBeNull()
  })

  it('aceita timestamp completo, usando só a parte da data', () => {
    expect(parseIsoDate('2026-01-05T23:59:00Z')?.getDate()).toBe(5)
  })
})

describe('toIsoDate', () => {
  it('usa os componentes locais e preenche com zero', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  /** `toISOString()` devolveria o dia anterior às 21h em São Paulo. */
  it('não escorrega para o dia anterior no fim do dia', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 22, 30))).toBe('2026-01-05')
  })
})

describe('shiftIsoDate', () => {
  it('anda para trás atravessando o início do mês', () => {
    expect(shiftIsoDate(-10, new Date(2026, 8, 6))).toBe('2026-08-27')
  })

  it('anda para trás atravessando a virada de ano', () => {
    expect(shiftIsoDate(-5, new Date(2026, 0, 3))).toBe('2025-12-29')
  })

  it('respeita ano bissexto', () => {
    expect(shiftIsoDate(-1, new Date(2028, 2, 1))).toBe('2028-02-29')
  })
})

describe('isoDaysBetween', () => {
  it('conta dias de calendário', () => {
    expect(isoDaysBetween('2026-02-09', '2026-02-10')).toBe(1)
    expect(isoDaysBetween('2026-02-10', '2026-02-10')).toBe(0)
    expect(isoDaysBetween('2026-02-28', '2026-03-01')).toBe(1)
  })

  it('é negativo quando a primeira data é posterior', () => {
    expect(isoDaysBetween('2026-02-12', '2026-02-10')).toBe(-2)
  })

  it('devolve null quando alguma data é ilegível', () => {
    expect(isoDaysBetween('sem data', '2026-02-10')).toBeNull()
    expect(isoDaysBetween('2026-02-10', '')).toBeNull()
  })
})

describe('businessDaysBetween', () => {
  it('sexta → segunda é 0 pregões (pula o fim de semana)', () => {
    expect(businessDaysBetween('2026-02-06', '2026-02-09')).toBe(0)
  })

  it('sexta → sábado/domingo é 0', () => {
    expect(businessDaysBetween('2026-02-06', '2026-02-07')).toBe(0)
    expect(businessDaysBetween('2026-02-06', '2026-02-08')).toBe(0)
  })

  it('quinta → segunda é 1 pregão (só sexta entre elas)', () => {
    expect(businessDaysBetween('2026-02-05', '2026-02-09')).toBe(1)
  })

  it('quarta → segunda é 2 pregões (quinta e sexta)', () => {
    expect(businessDaysBetween('2026-02-04', '2026-02-09')).toBe(2)
  })

  it('segunda → terça é 0 (nada fechou entre elas)', () => {
    expect(businessDaysBetween('2026-02-09', '2026-02-10')).toBe(0)
  })

  it('segunda → quarta é 1 pregão (terça entre elas)', () => {
    expect(businessDaysBetween('2026-02-09', '2026-02-11')).toBe(1)
  })

  it('mesma data é 0', () => {
    expect(businessDaysBetween('2026-02-10', '2026-02-10')).toBe(0)
  })

  it('destino antes da origem é 0, nunca negativo', () => {
    expect(businessDaysBetween('2026-02-10', '2026-02-06')).toBe(0)
  })

  it('data ilegível devolve null', () => {
    expect(businessDaysBetween('2026-02-31', '2026-02-10')).toBeNull()
    expect(businessDaysBetween('lixo', '2026-02-10')).toBeNull()
  })
})
