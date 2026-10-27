import { describe, it, expect, vi } from 'vitest'
import { _periodToSince, _enrichRows } from './useDividends'
import type { DividendRaw } from '../types'
import type { PositionWithAsset } from '../../portfolio/types'
import type { Transaction } from '../../portfolio/services/transactionsService'

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
  it('compra na data ex não cria direito e venda na data ex preserva a quantidade anterior', () => {
    const position = makePosition('PETR4', 100, { acquisition_date: '2026-01-01' })
    const transactions = [
      { ticker: 'PETR4', type: 'buy', quantity: 100, transaction_date: '2026-01-01' },
      { ticker: 'PETR4', type: 'buy', quantity: 20, transaction_date: '2026-03-15' },
      { ticker: 'PETR4', type: 'sell', quantity: 40, transaction_date: '2026-03-15' },
    ] as Transaction[]
    expect(_enrichRows([makeRaw()], [position], transactions)[0].quantity).toBe(100)
    expect(_enrichRows([makeRaw()], [makePosition('PETR4', 100, { acquisition_date: '2026-03-15' })])).toEqual([])
  })

  it('anúncios futuros consideram compras até hoje e ignoram lançamentos futuros', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
    try {
      const position = makePosition('PETR4', 120, { acquisition_date: '2026-01-01' })
      const transactions = [
        { ticker: 'PETR4', type: 'buy', quantity: 100, transaction_date: '2026-01-01' },
        { ticker: 'PETR4', type: 'buy', quantity: 20, transaction_date: '2026-10-26' },
        { ticker: 'PETR4', type: 'buy', quantity: 50, transaction_date: '2026-11-01' },
      ] as Transaction[]
      const result = _enrichRows([makeRaw({ ex_date: '2026-11-10', payment_date: null })], [position], transactions, true)
      expect(result[0].quantity).toBe(120)
      expect(result[0].currency).toBe('BRL')
    } finally { vi.useRealTimers() }
  })
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

  it('ignora proventos com data com anterior à primeira compra', () => {
    const position = makePosition('PETR4', 100, { acquisition_date: '2025-01-15' })
    const buys = [
      {
        ticker: 'PETR4',
        type: 'buy',
        quantity: 100,
        transaction_date: '2025-01-15',
      },
    ] as Transaction[]

    const result = _enrichRows([
      makeRaw({ ex_date: '2025-01-10', payment_date: '2025-02-01' }),
      makeRaw({ ex_date: '2025-01-20', payment_date: '2025-02-10' }),
    ], [position], buys)

    expect(result).toHaveLength(1)
    expect(result[0].ex_date).toBe('2025-01-20')
  })

  it('calcula o provento com a quantidade mantida na data com e inclui classe do ativo', () => {
    const position = makePosition('PETR4', 60, {
      acquisition_date: '2025-01-01',
      asset: { ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' },
    })
    const transactions = [
      { ticker: 'PETR4', type: 'buy', quantity: 100, transaction_date: '2025-01-01' },
      { ticker: 'PETR4', type: 'sell', quantity: 40, transaction_date: '2025-03-01' },
      { ticker: 'PETR4', type: 'buy', quantity: 25, transaction_date: '2025-04-01' },
    ] as Transaction[]

    const result = _enrichRows([
      makeRaw({ ex_date: '2025-03-15', value_per_share: 0.5 }),
    ], [position], transactions)

    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(60)
    expect(result[0].total_value).toBe(30)
    expect(result[0].asset_type).toBe('stock_br')
  })
})
