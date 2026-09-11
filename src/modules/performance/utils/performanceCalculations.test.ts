import { describe, it, expect } from 'vitest'
import {
  normalizeToBase100,
  computePortfolioReturn,
  buildBenchmarkSeries,
  extractReturnPct,
  computeAssetRows,
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


// ---------------------------------------------------------------------------
// computeAssetRows  (Story 4.2)
// ---------------------------------------------------------------------------

describe('computeAssetRows', () => {
  function makePos(
    ticker: string,
    average_price: number,
    quantity: number,
    name = ticker,
  ): PositionWithAsset {
    return {
      id: `id-${ticker}`,
      user_id: 'u1',
      ticker,
      quantity,
      average_price,
      acquisition_date: '2025-01-01',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      asset: { ticker, name, type: 'stock_br', currency: 'BRL' },
    } as unknown as PositionWithAsset
  }

  function makeDividendRow(ticker: string, value_per_share: number, quantity: number): DividendRow {
    return {
      ticker,
      type: 'dividend',
      ex_date: '2026-03-15',
      payment_date: '2026-04-01',
      value_per_share,
      quantity,
      total_value: value_per_share * quantity,
    }
  }

  it('happy path — linha completa com cotação e dividendos', () => {
    // PETR4: avgPrice=20, qty=100, cotação=22, dividendos=50
    const positions = [makePos('PETR4', 20, 100, 'Petrobras')]
    const lastPricesMap = new Map([['PETR4', 22]])
    const dividendRows = [makeDividendRow('PETR4', 0.5, 100)] // total=50

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.ticker).toBe('PETR4')
    expect(row.name).toBe('Petrobras')
    // capitalGainPct = ((22-20)/20)*100 = 10
    expect(row.capitalGainPct).toBeCloseTo(10)
    // dividendsReceived = 50
    expect(row.dividendsReceived).toBeCloseTo(50)
    // dividendsPct = (50 / (20*100)) * 100 = 2.5
    expect(row.dividendsPct).toBeCloseTo(2.5)
    // totalReturnPct = 10 + 2.5 = 12.5
    expect(row.totalReturnPct).toBeCloseTo(12.5)
  })

  it('sem cotação — capitalGainPct é null; retorno = dividendsPct', () => {
    const positions = [makePos('VALE3', 80, 50)]
    const lastPricesMap = new Map<string, number>() // sem cotação para VALE3
    const dividendRows = [makeDividendRow('VALE3', 2, 50)] // total=100

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.capitalGainPct).toBeNull()
    // dividendsPct = (100 / (80*50)) * 100 = 2.5
    expect(row.dividendsPct).toBeCloseTo(2.5)
    // totalReturnPct = 0 (capitalGain null →0) + 2.5 = 2.5
    expect(row.totalReturnPct).toBeCloseTo(2.5)
  })

  it('sem dividendos no período — dividendsReceived=0, dividendsPct=0', () => {
    const positions = [makePos('ITUB4', 30, 200)]
    const lastPricesMap = new Map([['ITUB4', 33]])
    const dividendRows: DividendRow[] = [] // nenhum dividendo

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.dividendsReceived).toBe(0)
    // dividendsPct = (0 / (30*200)) * 100 = 0
    expect(row.dividendsPct).toBeCloseTo(0)
    // capitalGainPct = ((33-30)/30)*100 = 10
    expect(row.capitalGainPct).toBeCloseTo(10)
    expect(row.totalReturnPct).toBeCloseTo(10)
  })

  it('preço médio zero — capitalGainPct e dividendsPct são null', () => {
    const positions = [makePos('BPAN4', 0, 100)]
    const lastPricesMap = new Map([['BPAN4', 5]])
    const dividendRows = [makeDividendRow('BPAN4', 0.1, 100)]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.capitalGainPct).toBeNull()
    expect(row.dividendsPct).toBeNull()
    expect(row.totalReturnPct).toBeNull()
    // dividendsReceived ainda é computado (é soma de total_value, não % )
    expect(row.dividendsReceived).toBeCloseTo(10)
  })

  it('sem cotação e preço médio zero — todos os % são null', () => {
    const positions = [makePos('XPTO3', 0, 50)]
    const lastPricesMap = new Map<string, number>()
    const dividendRows: DividendRow[] = []

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.capitalGainPct).toBeNull()
    expect(row.dividendsPct).toBeNull()
    expect(row.totalReturnPct).toBeNull()
    expect(row.dividendsReceived).toBe(0)
  })

  it('ordena por totalReturnPct decrescente — nulls ao final', () => {
    const positions = [
      makePos('A', 10, 100),  // retorno alto
      makePos('B', 10, 100),  // retorno médio
      makePos('C', 0, 100),   // null
    ]
    const lastPricesMap = new Map([
      ['A', 15], // +50%
      ['B', 11], // +10%
    ])
    const dividendRows: DividendRow[] = []

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows[0].ticker).toBe('A')
    expect(rows[1].ticker).toBe('B')
    expect(rows[2].ticker).toBe('C')
    expect(rows[2].totalReturnPct).toBeNull()
  })

  it('dividendos de múltiplos pagamentos são somados para o mesmo ticker', () => {
    const positions = [makePos('KDIF11', 100, 10)]
    const lastPricesMap = new Map([['KDIF11', 100]])
    // Dois pagamentos de proventos no período
    const dividendRows = [
      makeDividendRow('KDIF11', 5, 10),  // 50
      makeDividendRow('KDIF11', 3, 10),  // 30
    ]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)
    // dividendsReceived = 50 + 30 = 80
    expect(rows[0].dividendsReceived).toBeCloseTo(80)
    // dividendsPct = (80 / (100*10)) * 100 = 8
    expect(rows[0].dividendsPct).toBeCloseTo(8)
  })

  it('retorna array vazio quando não há posições', () => {
    const rows = computeAssetRows([], new Map(), [])
    expect(rows).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// computeAssetRows
// ---------------------------------------------------------------------------

describe('computeAssetRows', () => {
  // Helper: cria DividendRow para um ticker
  function makeDividendForTicker(ticker: string, valuePerShare: number, qty: number): DividendRow {
    return {
      ticker,
      type: 'dividend',
      ex_date: '2026-06-15',
      payment_date: '2026-07-01',
      value_per_share: valuePerShare,
      quantity: qty,
      total_value: valuePerShare * qty,
    }
  }

  it('happy path — linha completa com cotação e dividendos', () => {
    const positions = [makePosition('PETR4', 30.00, 100)]
    const lastPricesMap = new Map([['PETR4', 36.00]])
    const dividendRows = [makeDividendForTicker('PETR4', 1.50, 100)]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows).toHaveLength(1)
    const row = rows[0]

    expect(row.ticker).toBe('PETR4')
    // capitalGain = (36 - 30) / 30 * 100 = 20%
    expect(row.capitalGainPct).toBeCloseTo(20)
    // dividendsReceived = 1.50 * 100 = 150
    expect(row.dividendsReceived).toBeCloseTo(150)
    // dividendsPct = 150 / (30 * 100) * 100 = 5%
    expect(row.dividendsPct).toBeCloseTo(5)
    // totalReturn = 20 + 5 = 25%
    expect(row.totalReturnPct).toBeCloseTo(25)
  })

  it('sem cotação atual — capitalGainPct é null, totalReturn = dividendsPct', () => {
    const positions = [makePosition('BBAS3', 50.00, 10)]
    const lastPricesMap = new Map<string, number>() // sem cotação
    const dividendRows = [makeDividendForTicker('BBAS3', 2.00, 10)]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)
    const row = rows[0]

    expect(row.capitalGainPct).toBeNull()
    expect(row.dividendsReceived).toBeCloseTo(20)
    // dividendsPct = 20 / (50 * 10) * 100 = 4%
    expect(row.dividendsPct).toBeCloseTo(4)
    // totalReturn = 0 + 4 = 4% (capitalGain ?? 0)
    expect(row.totalReturnPct).toBeCloseTo(4)
  })

  it('sem dividendos no período — dividendsReceived = 0, dividendsPct = 0', () => {
    const positions = [makePosition('ITUB4', 25.00, 200)]
    const lastPricesMap = new Map([['ITUB4', 27.50]])
    const dividendRows: DividendRow[] = [] // nenhum provento

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)
    const row = rows[0]

    expect(row.dividendsReceived).toBe(0)
    expect(row.dividendsPct).toBeCloseTo(0)
    // capitalGain = (27.50 - 25) / 25 * 100 = 10%
    expect(row.capitalGainPct).toBeCloseTo(10)
    expect(row.totalReturnPct).toBeCloseTo(10)
  })

  it('preço médio zero — capitalGainPct e dividendsPct são null', () => {
    const positions = [makePosition('KNRI11', 0, 50)]
    const lastPricesMap = new Map([['KNRI11', 100.00]])
    const dividendRows = [makeDividendForTicker('KNRI11', 1.00, 50)]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)
    const row = rows[0]

    expect(row.capitalGainPct).toBeNull()
    expect(row.dividendsPct).toBeNull()
    // totalReturn: ambos null → null
    expect(row.totalReturnPct).toBeNull()
    // dividendsReceived ainda é calculado (não depende do preço médio)
    expect(row.dividendsReceived).toBeCloseTo(50)
  })

  it('ordena por totalReturnPct decrescente; nulls vão ao final', () => {
    const positions = [
      makePosition('A', 10, 1),
      makePosition('B', 0, 1),  // preço médio zero → totalReturn null
      makePosition('C', 20, 1),
    ]
    const lastPricesMap = new Map([
      ['A', 15],  // +50%
      ['C', 18],  // -10%
    ])
    const dividendRows: DividendRow[] = []

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)

    expect(rows[0].ticker).toBe('A')  // +50%
    expect(rows[1].ticker).toBe('C')  // -10%
    expect(rows[2].ticker).toBe('B')  // null → final
  })

  it('múltiplas linhas de dividendo para o mesmo ticker são somadas', () => {
    const positions = [makePosition('HGLG11', 100.00, 10)]
    const lastPricesMap = new Map([['HGLG11', 110.00]])
    const dividendRows = [
      makeDividendForTicker('HGLG11', 1.00, 10), // 10
      makeDividendForTicker('HGLG11', 0.50, 10), // 5
    ]

    const rows = computeAssetRows(positions, lastPricesMap, dividendRows)
    expect(rows[0].dividendsReceived).toBeCloseTo(15)
  })

  it('retorna array vazio quando não há posições', () => {
    const rows = computeAssetRows([], new Map(), [])
    expect(rows).toHaveLength(0)
  })
})
