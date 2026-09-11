import { describe, it, expect } from 'vitest'
import {
  normalizeToBase100,
  computePortfolioReturn,
  buildBenchmarkSeries,
  extractReturnPct,
} from './performanceCalculations'
import type { WealthPoint } from '../../wealth/types'
import type { DividendRow } from '../../dividends/types'
import type { PositionWithAsset } from '../../portfolio/types'
import type { BenchmarkRow } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWealth(entries: Array<[string, number | null]>): WealthPoint[] {
  return entries.map(([date, value]) => ({ date, value }))
}

function makeDividend(total_value: number): DividendRow {
  return {
    ticker: 'PETR4',
    type: 'dividend',
    ex_date: '2026-03-15',
    payment_date: '2026-04-01',
    value_per_share: 1.5,
    quantity: total_value / 1.5,
    total_value,
  }
}

function makePosition(ticker: string, average_price: number, quantity: number): PositionWithAsset {
  return {
    id: '1',
    user_id: 'u1',
    ticker,
    quantity,
    average_price,
    acquisition_date: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    asset: { ticker, name: ticker, type: 'stock_br', currency: 'BRL' },
  } as unknown as PositionWithAsset
}

function makeBenchmarkRow(name: string, date: string, value: number): BenchmarkRow {
  return { name, date, value, source: 'seed' }
}

// ---------------------------------------------------------------------------
// normalizeToBase100
// ---------------------------------------------------------------------------

describe('normalizeToBase100', () => {
  it('retorna array vazio para série vazia (sem posições / sem histórico)', () => {
    expect(normalizeToBase100([])).toEqual([])
  })

  it('retorna array vazio quando todos os valores são null', () => {
    expect(normalizeToBase100([
      { date: '2026-01-01', value: null },
      { date: '2026-01-02', value: null },
    ])).toEqual([])
  })

  it('normaliza o primeiro ponto positivo para 100', () => {
    const result = normalizeToBase100([{ date: '2026-01-01', value: 50000 }])
    expect(result[0].normalized).toBe(100)
  })

  it('normaliza corretamente uma série simples', () => {
    const result = normalizeToBase100([
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 110 },
      { date: '2026-01-03', value: 90 },
    ])
    expect(result).toHaveLength(3)
    expect(result[0].normalized).toBeCloseTo(100)
    expect(result[1].normalized).toBeCloseTo(110)
    expect(result[2].normalized).toBeCloseTo(90)
  })

  it('pula valores nulos no início para encontrar a âncora', () => {
    const result = normalizeToBase100([
      { date: '2026-01-01', value: null },
      { date: '2026-01-02', value: 200 },
      { date: '2026-01-03', value: 400 },
    ])
    // Âncora é o dia 2 (200), resultado tem 2 pontos
    expect(result).toHaveLength(2)
    expect(result[0].normalized).toBeCloseTo(100)
    expect(result[1].normalized).toBeCloseTo(200)
  })

  it('mantém pontos null no meio da série (gaps)', () => {
    const result = normalizeToBase100([
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: null },
      { date: '2026-01-03', value: 150 },
    ])
    expect(result).toHaveLength(3)
    expect(result[0].normalized).toBeCloseTo(100)
    expect(result[1].normalized).toBeNull()
    expect(result[2].normalized).toBeCloseTo(150)
  })

  it('preserva as datas originais', () => {
    const result = normalizeToBase100([
      { date: '2026-03-10', value: 1000 },
      { date: '2026-03-11', value: 1050 },
    ])
    expect(result[0].date).toBe('2026-03-10')
    expect(result[1].date).toBe('2026-03-11')
  })
})

// ---------------------------------------------------------------------------
// computePortfolioReturn — matriz de I/O da spec
// ---------------------------------------------------------------------------

describe('computePortfolioReturn', () => {
  it('retorna null para série vazia (sem histórico no período)', () => {
    expect(computePortfolioReturn([], [], [])).toBeNull()
  })

  it('retorna null quando todos os pontos da série são null', () => {
    const series = makeWealth([['2026-01-01', null], ['2026-01-02', null]])
    expect(computePortfolioReturn(series, [], [])).toBeNull()
  })

  it('retorna null quando valorInicial é zero', () => {
    const series = makeWealth([['2026-01-01', 0], ['2026-01-02', 10000]])
    expect(computePortfolioReturn(series, [], [])).toBeNull()
  })

  it('calcula retorno simples sem proventos nem aportes', () => {
    // valorInicial=100, valorFinal=115, proventos=0, aportes=0 → retorno=15%
    const series = makeWealth([
      ['2026-01-01', 100],
      ['2026-01-31', 115],
    ])
    const result = computePortfolioReturn(series, [], [])
    expect(result).toBeCloseTo(0.15)
  })

  it('inclui proventos recebidos no período na fórmula', () => {
    // valorInicial=1000, valorFinal=1050, proventos=100, aportes=0 → (1050+100-0)/1000-1 = 15%
    const series = makeWealth([
      ['2026-01-01', 1000],
      ['2026-01-31', 1050],
    ])
    const dividends = [makeDividend(100)]
    const result = computePortfolioReturn(series, dividends, [])
    expect(result).toBeCloseTo(0.15)
  })

  it('desconta aportes da fórmula de retorno', () => {
    // valorInicial=10000, valorFinal=11000, proventos=0, aportes=9000
    // retorno = (11000 + 0 - 9000) / 10000 - 1 = 2000/10000 - 1 = -0.8
    // A fórmula reflete que o capital aportado (custo) é subtraído do numerador.
    const series = makeWealth([
      ['2026-01-01', 10000],
      ['2026-06-30', 11000],
    ])
    const positions = [makePosition('PETR4', 90, 100)] // 90×100 = 9000
    const result = computePortfolioReturn(series, [], positions)
    expect(result).toBeCloseTo(-0.8)
  })

  it('usa o primeiro e o último ponto não-nulos como valorInicial/valorFinal', () => {
    const series = makeWealth([
      ['2026-01-01', null],
      ['2026-01-02', 1000],
      ['2026-01-03', null],
      ['2026-01-04', 1200],
    ])
    // primeiro não-nulo = 1000, último não-nulo = 1200 → retorno = 20%
    const result = computePortfolioReturn(series, [], [])
    expect(result).toBeCloseTo(0.2)
  })
})

// ---------------------------------------------------------------------------
// buildBenchmarkSeries
// ---------------------------------------------------------------------------

describe('buildBenchmarkSeries', () => {
  const config = [
    { name: 'CDI', label: 'CDI', color: '#22c55e' },
    { name: 'IBOV', label: 'IBOV', color: '#eab308' },
  ]

  it('retorna série vazia para benchmark sem dados no período', () => {
    const result = buildBenchmarkSeries([], config)
    expect(result).toHaveLength(2)
    expect(result[0].points).toHaveLength(0)
    expect(result[1].points).toHaveLength(0)
  })

  it('normaliza cada benchmark independentemente a base 100', () => {
    const rows: BenchmarkRow[] = [
      makeBenchmarkRow('CDI',  '2026-01-01', 110),
      makeBenchmarkRow('CDI',  '2026-01-02', 121),
      makeBenchmarkRow('IBOV', '2026-01-01', 130000),
      makeBenchmarkRow('IBOV', '2026-01-02', 126100), // queda
    ]
    const result = buildBenchmarkSeries(rows, config)

    const cdi  = result.find((s) => s.label === 'CDI')!
    const ibov = result.find((s) => s.label === 'IBOV')!

    expect(cdi.points[0].normalized).toBeCloseTo(100)
    expect(cdi.points[1].normalized).toBeCloseTo(110)   // 121/110 × 100

    expect(ibov.points[0].normalized).toBeCloseTo(100)
    expect(ibov.points[1].normalized).toBeCloseTo(97)   // 126100/130000 × 100
  })

  it('preserva label e color de cada série', () => {
    const result = buildBenchmarkSeries([], config)
    expect(result[0].label).toBe('CDI')
    expect(result[0].color).toBe('#22c55e')
    expect(result[1].label).toBe('IBOV')
    expect(result[1].color).toBe('#eab308')
  })
})

// ---------------------------------------------------------------------------
// extractReturnPct
// ---------------------------------------------------------------------------

describe('extractReturnPct', () => {
  it('retorna null para série sem pontos', () => {
    expect(extractReturnPct({ label: 'CDI', color: '#22c55e', points: [] })).toBeNull()
  })

  it('calcula retorno a partir do último ponto normalizado', () => {
    // normalized final = 110 → retorno = 10%
    const series = {
      label: 'CDI',
      color: '#22c55e',
      points: [
        { date: '2026-01-01', normalized: 100 },
        { date: '2026-01-31', normalized: 110 },
      ],
    }
    expect(extractReturnPct(series)).toBeCloseTo(0.1)
  })

  it('retorna null quando o último ponto é null', () => {
    const series = {
      label: 'CDI',
      color: '#22c55e',
      points: [
        { date: '2026-01-01', normalized: 100 },
        { date: '2026-01-31', normalized: null as unknown as number },
      ],
    }
    expect(extractReturnPct(series)).toBeNull()
  })
})
