import { describe, it, expect } from 'vitest'
import { _periodToSince, _enrichRows } from './useDividends'
import type { DividendRaw } from '../types'
import type { PositionWithAsset } from '../../portfolio/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRaw(overrides: Partial<DividendRaw> = {}): DividendRaw {
  return {
    ticker: 'PETR4',
    type: 'dividend',
    ex_date: '2026-03-15',
    payment_date: '2026-04-01',
    value_per_share: 1.5,
    ...overrides,
  }
}

function makePosition(
  ticker: string,
  quantity: number,
  overrides: Partial<PositionWithAsset> = {},
): PositionWithAsset {
  return {
    id: '1',
    user_id: 'user-1',
    ticker,
    quantity,
    average_price: 10,
    created_at: '2026-01-01T00:00:00Z',
    asset: { ticker, name: ticker, type: 'acao', currency: 'BRL' },
    ...overrides,
  } as unknown as PositionWithAsset
}

// ---------------------------------------------------------------------------
// periodToSince
// ---------------------------------------------------------------------------

describe('_periodToSince', () => {
  it("'Tudo' retorna 1970-01-01", () => {
    expect(_periodToSince('Tudo')).toBe('1970-01-01')
  })

  it("'6M' retorna data aproximadamente 183 dias atrás, no formato YYYY-MM-DD", () => {
    const result = _periodToSince('6M')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const today = new Date()
    const resultDate = new Date(result)
    const diffDays = Math.round((today.getTime() - resultDate.getTime()) / 86_400_000)
    // Tolerância de ±2 dias para cobrir variações de fuso/horário
    expect(diffDays).toBeGreaterThanOrEqual(181)
    expect(diffDays).toBeLessThanOrEqual(185)
  })

  it("'1A' retorna data aproximadamente 365 dias atrás, no formato YYYY-MM-DD", () => {
    const result = _periodToSince('1A')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const today = new Date()
    const resultDate = new Date(result)
    const diffDays = Math.round((today.getTime() - resultDate.getTime()) / 86_400_000)
    expect(diffDays).toBeGreaterThanOrEqual(363)
    expect(diffDays).toBeLessThanOrEqual(367)
  })

  it("'6M' produz data anterior à '1A'", () => {
    // 6M deve ser mais recente (data maior) que 1A
    const sixMonths = _periodToSince('6M')
    const oneYear = _periodToSince('1A')
    expect(sixMonths > oneYear).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// enrichRows
// ---------------------------------------------------------------------------

describe('_enrichRows', () => {
  it('retorna array vazio quando raw é vazio', () => {
    const result = _enrichRows([], [makePosition('PETR4', 100)])
    expect(result).toHaveLength(0)
  })

  it('retorna array vazio quando positions é vazio', () => {
    const result = _enrichRows([makeRaw()], [])
    expect(result).toHaveLength(0)
  })

  it('calcula total_value como value_per_share × quantity', () => {
    const raw = [makeRaw({ ticker: 'PETR4', value_per_share: 1.5 })]
    const positions = [makePosition('PETR4', 200)]

    const result = _enrichRows(raw, positions)

    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(200)
    expect(result[0].total_value).toBeCloseTo(300)
  })

  it('descarta linhas cujo ticker não está nas posições', () => {
    const raw = [makeRaw({ ticker: 'BBAS3' })]
    const positions = [makePosition('PETR4', 100)]

    const result = _enrichRows(raw, positions)

    expect(result).toHaveLength(0)
  })

  it('descarta linhas onde a quantidade da posição é zero', () => {
    const raw = [makeRaw({ ticker: 'PETR4' })]
    const positions = [makePosition('PETR4', 0)]

    const result = _enrichRows(raw, positions)

    expect(result).toHaveLength(0)
  })

  it('processa múltiplos tickers corretamente', () => {
    const raw = [
      makeRaw({ ticker: 'PETR4', value_per_share: 2 }),
      makeRaw({ ticker: 'VALE3', value_per_share: 3 }),
      makeRaw({ ticker: 'BBAS3', value_per_share: 1 }), // sem posição
    ]
    const positions = [makePosition('PETR4', 100), makePosition('VALE3', 50)]

    const result = _enrichRows(raw, positions)

    expect(result).toHaveLength(2)
    expect(result.find((r) => r.ticker === 'PETR4')?.total_value).toBeCloseTo(200)
    expect(result.find((r) => r.ticker === 'VALE3')?.total_value).toBeCloseTo(150)
  })

  it('preserva todos os campos originais da linha bruta', () => {
    const raw = [
      makeRaw({
        ticker: 'PETR4',
        type: 'jcp',
        ex_date: '2026-06-10',
        payment_date: '2026-07-01',
        value_per_share: 0.8,
      }),
    ]
    const positions = [makePosition('PETR4', 50)]

    const result = _enrichRows(raw, positions)

    expect(result[0].type).toBe('jcp')
    expect(result[0].ex_date).toBe('2026-06-10')
    expect(result[0].payment_date).toBe('2026-07-01')
    expect(result[0].value_per_share).toBe(0.8)
  })

  it('não muta o array de raw recebido', () => {
    const raw = [makeRaw()]
    const original = [...raw]
    const positions = [makePosition('PETR4', 100)]

    _enrichRows(raw, positions)

    expect(raw).toEqual(original)
  })
})
