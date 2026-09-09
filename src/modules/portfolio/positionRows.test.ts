import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POSITION_SORT,
  derivePositionRows,
  nextSort,
  sortPositionRows,
  toNumber,
} from './positionRows'
import type { LatestQuote, PositionWithAsset } from './types'

const TODAY = '2026-02-10'

function position(overrides: Partial<PositionWithAsset> = {}): PositionWithAsset {
  return {
    id: 'pos-1',
    user_id: '11111111-1111-4111-8111-111111111111',
    ticker: 'PETR4',
    quantity: 100,
    average_price: 32.1,
    acquisition_date: '2026-01-15',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    asset: { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock_br', currency: 'BRL' },
    ...overrides,
  } as PositionWithAsset
}

function usdPosition(overrides: Partial<PositionWithAsset> = {}): PositionWithAsset {
  return position({
    id: 'pos-usd',
    ticker: 'AAPL',
    quantity: 10,
    average_price: 120,
    asset: { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
    ...overrides,
  })
}

function quote(overrides: Partial<LatestQuote> = {}): LatestQuote {
  return {
    ticker: 'PETR4',
    close: 34.5,
    source: 'b3_cotahist',
    date: TODAY,
    updated_at: '2026-02-10T21:30:00Z',
    ...overrides,
  }
}

function derive(input: Partial<Parameters<typeof derivePositionRows>[0]> = {}) {
  return derivePositionRows({
    positions: input.positions ?? [position()],
    quotes: input.quotes ?? [quote()],
    usdRate: input.usdRate === undefined ? 5 : input.usdRate,
    today: input.today ?? TODAY,
  })
}

describe('toNumber', () => {
  it('trata string vazia como ilegível, não como zero', () => {
    // `Number('')` é 0: exibir "0" para um valor que ninguém informou é o mesmo
    // defeito de `NaN`, só mais difícil de notar.
    expect(toNumber('')).toBeNaN()
    expect(toNumber('   ')).toBeNaN()
    expect(toNumber(null)).toBeNaN()
    expect(toNumber('n/d')).toBeNaN()
  })

  it('converte numeric serializado como string', () => {
    expect(toNumber('32.1000')).toBe(32.1)
    expect(toNumber(32.1)).toBe(32.1)
  })
})

describe('derivePositionRows — valor de mercado e total', () => {
  it('soma no total só o que tem cotação e conta as lacunas', () => {
    const derived = derive({
      positions: [
        position({ id: 'p1', ticker: 'PETR4', quantity: 100 }),
        position({ id: 'p2', ticker: 'ZZZZ3' }),
      ],
      quotes: [quote({ ticker: 'PETR4', close: 30 })],
    })

    expect(derived.totalBRL).toBe(3000)
    expect(derived.missingValueCount).toBe(1)
    expect(derived.rows[1].marketValueBRL).toBeNull()
    expect(derived.rows[1].weightPercent).toBeNull()
  })

  it('pesos das posições avaliadas somam 100%', () => {
    const derived = derive({
      positions: [
        position({ id: 'p1', ticker: 'PETR4', quantity: 100 }),
        position({ id: 'p2', ticker: 'VALE3', quantity: 20 }),
        position({ id: 'p3', ticker: 'ZZZZ3' }),
      ],
      quotes: [quote({ ticker: 'PETR4', close: 30 }), quote({ ticker: 'VALE3', close: 60 })],
    })

    const total = derived.rows.reduce((sum, row) => sum + (row.weightPercent ?? 0), 0)
    expect(total).toBeCloseTo(100, 10)
  })

  it('quantidade ilegível não vira zero no total', () => {
    const derived = derive({
      positions: [position({ quantity: 'n/d' as unknown as number })],
    })

    expect(derived.rows[0].marketValueBRL).toBeNull()
    expect(derived.totalBRL).toBe(0)
    expect(derived.missingValueCount).toBe(1)
  })

  it('total zero não produz peso 0% — não há proporção definível', () => {
    const derived = derive({ positions: [position()], quotes: [] })

    expect(derived.totalBRL).toBe(0)
    expect(derived.rows[0].weightPercent).toBeNull()
  })
})

describe('derivePositionRows — conversão USD', () => {
  it('converte a moeda do ativo, não a classe', () => {
    // Cripto também é `currency = 'USD'`: filtrar por `type` deixaria BTC fora.
    const derived = derive({
      positions: [
        usdPosition({
          id: 'btc',
          ticker: 'BTC',
          quantity: 0.5,
          asset: { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD' },
        }),
      ],
      quotes: [quote({ ticker: 'BTC', close: 100_000 })],
      usdRate: 5,
    })

    expect(derived.rows[0].marketValueBRL).toBe(250_000)
    expect(derived.rows[0].usesUSDRate).toBe(true)
    expect(derived.usesUSDRate).toBe(true)
  })

  /**
   * Sem taxa, tratar dólar como 1:1 subestimaria a posição em cinco vezes e o
   * número apareceria como se fosse certo. A lacuna é a resposta honesta.
   */
  it('sem taxa disponível, posição em USD fica sem valor de mercado', () => {
    const derived = derive({
      positions: [usdPosition()],
      quotes: [quote({ ticker: 'AAPL', close: 150 })],
      usdRate: null,
    })

    expect(derived.rows[0].marketValueBRL).toBeNull()
    expect(derived.missingValueCount).toBe(1)
    expect(derived.usesUSDRate).toBe(false)
  })

  it('posição em BRL não depende da taxa USD', () => {
    const derived = derive({ positions: [position({ quantity: 10 })], usdRate: null })

    expect(derived.rows[0].marketValueBRL).toBe(345)
    expect(derived.usesUSDRate).toBe(false)
  })

  it('ativo sem join do catálogo não é convertido às cegas', () => {
    const derived = derive({ positions: [position({ asset: null, quantity: 10 })] })

    // Sem `currency` conhecida, o número fica na moeda em que veio.
    expect(derived.rows[0].currency).toBeNull()
    expect(derived.rows[0].marketValueBRL).toBe(345)
    expect(derived.rows[0].usesUSDRate).toBe(false)
  })
})

describe('derivePositionRows — variação', () => {
  it('mede a cotação contra o preço médio, na moeda do ativo', () => {
    const derived = derive({
      positions: [usdPosition({ average_price: 120 })],
      quotes: [quote({ ticker: 'AAPL', close: 150 })],
    })

    expect(derived.rows[0].changePercent).toBeCloseTo(25, 10)
  })

  it('preço médio zero não produz Infinity', () => {
    const derived = derive({ positions: [position({ average_price: 0 })] })

    expect(derived.rows[0].changePercent).toBeNull()
  })

  it('sem cotação não há variação', () => {
    const derived = derive({ positions: [position()], quotes: [] })

    expect(derived.rows[0].changePercent).toBeNull()
  })
})

describe('derivePositionRows — cotação antiga', () => {
  it.each([
    [TODAY, false],
    ['2026-02-09', false], // segunda vista na terça: 0 pregões
    ['2026-02-06', false], // sexta vista na terça: 1 pregão (segunda), não > 1
    ['2026-02-05', true], // quinta vista na terça: 2 pregões (sex, seg) > 1
    ['2026-01-10', true], // muito atrás
  ])('fechamento em %s → antiga: %s', (date, expected) => {
    const derived = derive({ quotes: [quote({ date })] })

    expect(derived.rows[0].isStaleQuote).toBe(expected)
  })

  it('data ilegível não é afirmada como antiga', () => {
    const derived = derive({ quotes: [quote({ date: 'sem data' })] })

    expect(derived.rows[0].isStaleQuote).toBe(false)
  })

  it('fechamento futuro não é antigo', () => {
    const derived = derive({ quotes: [quote({ date: '2026-02-12' })] })

    expect(derived.rows[0].isStaleQuote).toBe(false)
  })
})

describe('sortPositionRows', () => {
  function rowsFor() {
    return derive({
      positions: [
        position({ id: 'p1', ticker: 'PETR4', quantity: 100, average_price: 32.1 }),
        position({ id: 'p2', ticker: 'BBAS3', quantity: 10, average_price: 20 }),
        position({ id: 'p3', ticker: 'ZZZZ3' }),
      ],
      quotes: [quote({ ticker: 'PETR4', close: 34.5 }), quote({ ticker: 'BBAS3', close: 25 })],
    }).rows
  }

  it('ordena por peso decrescente por padrão', () => {
    const sorted = sortPositionRows(rowsFor(), DEFAULT_POSITION_SORT)

    expect(sorted.map((row) => row.ticker)).toEqual(['PETR4', 'BBAS3', 'ZZZZ3'])
    expect(DEFAULT_POSITION_SORT).toEqual({ column: 'weight', direction: 'desc' })
  })

  it('ordena por ticker em ordem alfabética', () => {
    const sorted = sortPositionRows(rowsFor(), { column: 'ticker', direction: 'asc' })

    expect(sorted.map((row) => row.ticker)).toEqual(['BBAS3', 'PETR4', 'ZZZZ3'])
  })

  it('linha sem métrica fica no fim nas duas direções', () => {
    for (const direction of ['asc', 'desc'] as const) {
      const sorted = sortPositionRows(rowsFor(), { column: 'change', direction })
      expect(sorted[sorted.length - 1].ticker).toBe('ZZZZ3')
    }
  })

  it('não muta o array recebido', () => {
    const rows = rowsFor()
    const original = rows.map((row) => row.ticker)

    sortPositionRows(rows, { column: 'ticker', direction: 'desc' })

    expect(rows.map((row) => row.ticker)).toEqual(original)
  })
})

describe('nextSort', () => {
  it('adota a coluna nova com a direção natural dela', () => {
    expect(nextSort(DEFAULT_POSITION_SORT, 'ticker')).toEqual({
      column: 'ticker',
      direction: 'asc',
    })
    expect(nextSort({ column: 'ticker', direction: 'asc' }, 'change')).toEqual({
      column: 'change',
      direction: 'desc',
    })
  })

  it('inverte quando a coluna já é a ativa', () => {
    expect(nextSort({ column: 'weight', direction: 'desc' }, 'weight')).toEqual({
      column: 'weight',
      direction: 'asc',
    })
  })
})

describe('derivePositionRows — flag de cotação antiga por dia útil', () => {
  it('não marca cotação de sexta vista na segunda', () => {
    // 2026-02-06 é sexta; 2026-02-09 é segunda. Em dias corridos são 3 dias e
    // acenderia alarme falso; em dias úteis são 0 pregões de atraso.
    const [row] = derive({
      quotes: [quote({ date: '2026-02-06' })],
      today: '2026-02-09',
    }).rows
    expect(row.isStaleQuote).toBe(false)
  })

  it('não marca cotação de sexta vista no sábado ou domingo', () => {
    const sat = derive({ quotes: [quote({ date: '2026-02-06' })], today: '2026-02-07' }).rows[0]
    const sun = derive({ quotes: [quote({ date: '2026-02-06' })], today: '2026-02-08' }).rows[0]
    expect(sat.isStaleQuote).toBe(false)
    expect(sun.isStaleQuote).toBe(false)
  })

  it('marca quando há mais de um pregão de atraso', () => {
    // Quarta 2026-02-04 vista na segunda 2026-02-09: quinta e sexta ficaram
    // entre elas = 2 pregões de atraso (> 1) → antiga.
    const [row] = derive({
      quotes: [quote({ date: '2026-02-04' })],
      today: '2026-02-09',
    }).rows
    expect(row.isStaleQuote).toBe(true)
  })

  it('um único pregão de atraso ainda não é antiga', () => {
    // Quinta 2026-02-05 vista na segunda 2026-02-09: só sexta entre elas = 1
    // pregão (não > 1) → ainda fresca.
    const [row] = derive({
      quotes: [quote({ date: '2026-02-05' })],
      today: '2026-02-09',
    }).rows
    expect(row.isStaleQuote).toBe(false)
  })

  it('não marca cotação do próprio dia', () => {
    const [row] = derive({ quotes: [quote({ date: '2026-02-10' })], today: '2026-02-10' }).rows
    expect(row.isStaleQuote).toBe(false)
  })
})

describe('derivePositionRows — guards de valor', () => {
  it('taxa USD zero não soma posição em dólar como R$ 0,00', () => {
    const derived = derive({ positions: [usdPosition()], quotes: [quote({ ticker: 'AAPL', close: 150 })], usdRate: 0 })
    expect(derived.rows[0].marketValueBRL).toBeNull()
    expect(derived.totalBRL).toBe(0)
    expect(derived.missingValueCount).toBe(1)
  })

  it('taxa USD negativa não produz valor de mercado', () => {
    const derived = derive({ positions: [usdPosition()], quotes: [quote({ ticker: 'AAPL', close: 150 })], usdRate: -5 })
    expect(derived.rows[0].marketValueBRL).toBeNull()
  })

  it('cotação zero ou negativa é lacuna, não valor', () => {
    const zero = derive({ quotes: [quote({ close: 0 })] }).rows[0]
    const neg = derive({ quotes: [quote({ close: -3 })] }).rows[0]
    expect(zero.marketValueBRL).toBeNull()
    expect(neg.marketValueBRL).toBeNull()
  })
})
