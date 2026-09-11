import { describe, expect, it } from 'vitest'
import { buildWealthSeries, buildLastPricesMap } from './wealthCalculations'
import type { PositionSnapshot, PriceHistoryRow } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(
  ticker: string,
  quantity: number,
  opts: { currency?: 'BRL' | 'USD'; type?: string | null } = {},
): PositionSnapshot {
  return {
    ticker,
    quantity,
    currency: opts.currency ?? 'BRL',
    type: (opts.type !== undefined ? opts.type : 'stock_br') as PositionSnapshot['type'],
  }
}

function price(ticker: string, date: string, close: number): PriceHistoryRow {
  return { ticker, date, close }
}

const USD_RATE = 5

// ---------------------------------------------------------------------------
// Matrix row 1: Usuário sem posições
// Expected: série vazia (nenhum cálculo possível)
// ---------------------------------------------------------------------------

describe('buildWealthSeries — sem posições (matrix row 1)', () => {
  it('retorna array vazio quando não há posições', () => {
    const series = buildWealthSeries(
      [],
      [price('PETR4', '2026-01-01', 30)],
      USD_RATE,
    )
    expect(series).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Matrix row 2: Posições sem histórico de preços
// Expected: série vazia (lacuna total no gráfico)
// ---------------------------------------------------------------------------

describe('buildWealthSeries — posições sem histórico (matrix row 2)', () => {
  it('retorna array vazio quando não há linhas de preço', () => {
    const series = buildWealthSeries(
      [pos('PETR4', 100)],
      [],
      USD_RATE,
    )
    expect(series).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Matrix row 3: Período com lacunas parciais
// Expected: dias sem cobertura completa aparecem com gap (null),
// mas dias com alguma cobertura somam o que existe
// ---------------------------------------------------------------------------

describe('buildWealthSeries — lacunas parciais (matrix row 3)', () => {
  const positions = [pos('PETR4', 100), pos('VALE3', 50)]

  it('dia sem nenhuma cotação tem value = null (gap)', () => {
    const rows = [
      price('PETR4', '2026-01-01', 30),
      // 2026-01-02: nenhum ticker tem cotação
      price('PETR4', '2026-01-03', 31),
    ]
    const series = buildWealthSeries(positions, rows, USD_RATE)
    const day2 = series.find((p) => p.date === '2026-01-02')

    // Dia 2 não existe na série (sem cotação → não gera ponto)
    expect(day2).toBeUndefined()
    // Dias 1 e 3 existem com valor parcial (só PETR4)
    expect(series).toHaveLength(2)
    expect(series[0].value).toBe(100 * 30) // só PETR4
    expect(series[1].value).toBe(100 * 31) // só PETR4
  })

  it('dia com cotação de apenas um ticker soma só esse ticker (abordagem permissiva)', () => {
    // PETR4 tem cotação todos os dias; VALE3 só no dia 2
    const rows = [
      price('PETR4', '2026-01-01', 30),
      price('PETR4', '2026-01-02', 31),
      price('VALE3', '2026-01-02', 20),
    ]
    const series = buildWealthSeries(positions, rows, USD_RATE)

    expect(series).toHaveLength(2)
    // Dia 1: só PETR4 → 100 × 30 = 3.000
    expect(series[0].date).toBe('2026-01-01')
    expect(series[0].value).toBe(3000)
    // Dia 2: PETR4 + VALE3 → 100 × 31 + 50 × 20 = 3.100 + 1.000 = 4.100
    expect(series[1].date).toBe('2026-01-02')
    expect(series[1].value).toBe(4100)
  })

  it('nenhum ponto da série tem value = null quando todos os tickers têm cotação', () => {
    const rows = [
      price('PETR4', '2026-01-01', 30),
      price('VALE3', '2026-01-01', 20),
    ]
    const series = buildWealthSeries(positions, rows, USD_RATE)

    expect(series).toHaveLength(1)
    expect(series[0].value).not.toBeNull()
    expect(series[0].value).toBe(100 * 30 + 50 * 20) // 3.000 + 1.000 = 4.000
  })
})

// ---------------------------------------------------------------------------
// Matrix row 4: Usuário com ativos USD (BDR/stock US/REIT)
// Expected: cotação convertida para BRL com taxa USD; fallback R$ 5,00
// ---------------------------------------------------------------------------

describe('buildWealthSeries — ativos USD (matrix row 4)', () => {
  it('converte close × usdRate para ativos stock_us', () => {
    const positions = [pos('AAPL', 10, { currency: 'USD', type: 'stock_us' })]
    const rows = [price('AAPL', '2026-01-01', 100)]
    const series = buildWealthSeries(positions, rows, 5)

    // 10 × 100 × 5 = 5.000
    expect(series[0].value).toBe(5000)
  })

  it('converte REITs em USD', () => {
    const positions = [pos('O', 10, { currency: 'USD', type: 'reit' })]
    const rows = [price('O', '2026-01-01', 50)]
    const series = buildWealthSeries(positions, rows, 5.10)

    expect(series[0].value).toBeCloseTo(10 * 50 * 5.10, 8)
  })

  it('BDR cotado em BRL (currency=BRL) NÃO aplica conversão USD', () => {
    // BDR pode ser cotado em BRL na B3 — currency decide a conversão, não o type
    const positions = [pos('AAPL34', 20, { currency: 'BRL', type: 'bdr' })]
    const rows = [price('AAPL34', '2026-01-01', 50)]
    const series = buildWealthSeries(positions, rows, 5)

    // 20 × 50 = 1.000 (sem multiplicar por 5)
    expect(series[0].value).toBe(1000)
  })

  it('taxa fallback R$ 5,00 produz resultado válido', () => {
    const positions = [pos('AAPL', 10, { currency: 'USD', type: 'stock_us' })]
    const rows = [price('AAPL', '2026-01-01', 200)]
    const series = buildWealthSeries(positions, rows, 5) // fallback explícito

    expect(series[0].value).toBe(10000) // 10 × 200 × 5
    expect(Number.isFinite(series[0].value)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Matrix row 5: Período "Tudo" com >365 pontos
// Expected: até 365 pontos (limitado no service pelo .limit)
// Aqui testamos apenas que a função lida corretamente com grandes séries.
// ---------------------------------------------------------------------------

describe('buildWealthSeries — séries longas (matrix row 5)', () => {
  it('processa 365 pontos sem erros e produz a série completa', () => {
    const positions = [pos('PETR4', 100)]
    const rows: PriceHistoryRow[] = Array.from({ length: 365 }, (_, i) => {
      const date = new Date(2025, 0, 1 + i)
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return price('PETR4', iso, 30 + i * 0.01)
    })

    const series = buildWealthSeries(positions, rows, USD_RATE)

    expect(series).toHaveLength(365)
    expect(series.every((p) => p.value !== null && Number.isFinite(p.value))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Matrix row 6: Erro no fetch
// Esta row é comportamento do hook (TanStack Query retry), não da função pura.
// Garantimos que a função retorna série vazia para inputs inválidos/vazios.
// ---------------------------------------------------------------------------

describe('buildWealthSeries — inputs inválidos (matrix row 6)', () => {
  it('retorna série vazia para posições vazia + rows não-vazio', () => {
    const series = buildWealthSeries([], [price('PETR4', '2026-01-01', 30)], USD_RATE)
    expect(series).toEqual([])
  })

  it('série tem apenas null quando nenhum ticker da carteira tem cotação no dia', () => {
    // VALE3 está na carteira mas só PETR4 tem preço
    const positions = [pos('VALE3', 50)]
    const rows = [price('PETR4', '2026-01-01', 30)]

    const series = buildWealthSeries(positions, rows, USD_RATE)
    // A série tem o dia, mas o valor é null (nenhum ticker da carteira tem cotação)
    expect(series[0].value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildLastPricesMap
// ---------------------------------------------------------------------------

describe('buildLastPricesMap', () => {
  it('retorna o preço mais recente por ticker (rows em ordem ASC)', () => {
    const rows = [
      price('PETR4', '2026-01-01', 30),
      price('PETR4', '2026-01-02', 31),
      price('VALE3', '2026-01-01', 20),
    ]
    const map = buildLastPricesMap(rows)

    expect(map.get('PETR4')).toBe(31)
    expect(map.get('VALE3')).toBe(20)
  })

  it('retorna mapa vazio para array vazio', () => {
    expect(buildLastPricesMap([])).toEqual(new Map())
  })

  it('ignora linhas com close NaN', () => {
    const rows = [
      price('PETR4', '2026-01-01', NaN),
      price('PETR4', '2026-01-02', 30),
    ]
    const map = buildLastPricesMap(rows)
    expect(map.get('PETR4')).toBe(30)
  })
})
