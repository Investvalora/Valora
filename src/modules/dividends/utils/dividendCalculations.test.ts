import { describe, it, expect } from 'vitest'
import { buildMonthlyBars, filterAndSort, sumTotalValue } from './dividendCalculations'
import type { DividendRow, DividendSort } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<DividendRow> = {}): DividendRow {
  return {
    ticker: 'PETR4',
    type: 'dividend',
    ex_date: '2026-03-15',
    payment_date: '2026-04-01',
    value_per_share: 1.5,
    quantity: 100,
    total_value: 150,
    ...overrides,
  }
}

const DEFAULT_SORT: DividendSort = { column: 'ex_date', direction: 'desc' }

// ---------------------------------------------------------------------------
// buildMonthlyBars
// ---------------------------------------------------------------------------

describe('buildMonthlyBars', () => {
  it('retorna array vazio para lista vazia (sem posições / sem dividendos)', () => {
    expect(buildMonthlyBars([])).toEqual([])
  })

  it('agrupa linhas do mesmo mês e soma total_value', () => {
    const rows: DividendRow[] = [
      makeRow({ ex_date: '2026-03-15', total_value: 150 }),
      makeRow({ ex_date: '2026-03-20', total_value: 80 }),
      makeRow({ ex_date: '2026-04-10', total_value: 200 }),
    ]

    const bars = buildMonthlyBars(rows)

    expect(bars).toHaveLength(2)
    expect(bars[0]).toEqual({ month: '2026-03', total: 230 })
    expect(bars[1]).toEqual({ month: '2026-04', total: 200 })
  })

  it('retorna barras ordenadas cronologicamente (mais antigo primeiro)', () => {
    const rows: DividendRow[] = [
      makeRow({ ex_date: '2026-06-01', total_value: 50 }),
      makeRow({ ex_date: '2026-01-15', total_value: 100 }),
      makeRow({ ex_date: '2026-04-20', total_value: 75 }),
    ]

    const bars = buildMonthlyBars(rows)
    const months = bars.map((b) => b.month)

    expect(months).toEqual(['2026-01', '2026-04', '2026-06'])
  })

  it('ignora linhas com ex_date inválida', () => {
    const rows: DividendRow[] = [
      makeRow({ ex_date: 'invalid-date', total_value: 999 }),
      makeRow({ ex_date: '2026-03-15', total_value: 100 }),
    ]

    const bars = buildMonthlyBars(rows)
    expect(bars).toHaveLength(1)
    expect(bars[0].month).toBe('2026-03')
  })

  it('não inclui proventos futuros (ex_date > hoje) — responsabilidade do service/hook, mas a função não deve alterar os dados recebidos', () => {
    // buildMonthlyBars não filtra por data — esse filtro é feito pelo service.
    // O teste confirma que linhas com datas futuras passadas ao buildMonthlyBars
    // são incluídas normalmente (o hook garante que elas não chegam aqui).
    const futureRow = makeRow({ ex_date: '2099-12-31', total_value: 500 })
    const bars = buildMonthlyBars([futureRow])
    expect(bars).toHaveLength(1)
    expect(bars[0].month).toBe('2099-12')
  })
})

// ---------------------------------------------------------------------------
// filterAndSort
// ---------------------------------------------------------------------------

describe('filterAndSort', () => {
  const rows: DividendRow[] = [
    makeRow({ ticker: 'PETR4', type: 'dividend', ex_date: '2026-01-10', total_value: 100 }),
    makeRow({ ticker: 'VALE3', type: 'jcp', ex_date: '2026-03-05', total_value: 250 }),
    makeRow({ ticker: 'MXRF11', type: 'dividend', ex_date: '2026-02-20', total_value: 80 }),
    makeRow({ ticker: 'PETR4', type: 'jcp', ex_date: '2026-06-15', total_value: 120 }),
  ]

  it('sem filtros, ordena por ex_date decrescente por padrão', () => {
    const result = filterAndSort(rows, '', '', DEFAULT_SORT)
    const dates = result.map((r) => r.ex_date)
    expect(dates).toEqual(['2026-06-15', '2026-03-05', '2026-02-20', '2026-01-10'])
  })

  it('filtra por ticker (case-insensitive, substring)', () => {
    const result = filterAndSort(rows, 'petr', '', DEFAULT_SORT)
    expect(result.map((r) => r.ticker)).toEqual(['PETR4', 'PETR4'])
  })

  it('filtra por tipo exato', () => {
    const result = filterAndSort(rows, '', 'jcp', DEFAULT_SORT)
    expect(result.map((r) => r.type)).toEqual(['jcp', 'jcp'])
  })

  it('filtra por tipo com case diferente (case-insensitive)', () => {
    // O DB pode armazenar 'JCP', 'Jcp' ou 'jcp' — o filtro deve ser robusto
    const result = filterAndSort(rows, '', 'JCP', DEFAULT_SORT)
    expect(result.map((r) => r.type)).toEqual(['jcp', 'jcp'])
  })

  it('combina filtro de ticker e tipo', () => {
    const result = filterAndSort(rows, 'petr', 'jcp', DEFAULT_SORT)
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('PETR4')
    expect(result[0].type).toBe('jcp')
  })

  it('ordena por total_value crescente', () => {
    const sort: DividendSort = { column: 'total_value', direction: 'asc' }
    const result = filterAndSort(rows, '', '', sort)
    const values = result.map((r) => r.total_value)
    expect(values).toEqual([80, 100, 120, 250])
  })

  it('ordena por total_value decrescente', () => {
    const sort: DividendSort = { column: 'total_value', direction: 'desc' }
    const result = filterAndSort(rows, '', '', sort)
    const values = result.map((r) => r.total_value)
    expect(values).toEqual([250, 120, 100, 80])
  })

  it('ordena por ticker alfabeticamente', () => {
    const sort: DividendSort = { column: 'ticker', direction: 'asc' }
    const result = filterAndSort(rows, '', '', sort)
    const tickers = result.map((r) => r.ticker)
    expect(tickers).toEqual(['MXRF11', 'PETR4', 'PETR4', 'VALE3'])
  })

  it('retorna array vazio quando nenhuma linha passa no filtro', () => {
    const result = filterAndSort(rows, 'TICKER_INEXISTENTE', '', DEFAULT_SORT)
    expect(result).toHaveLength(0)
  })

  it('não muta o array original', () => {
    const original = [...rows]
    filterAndSort(rows, '', '', DEFAULT_SORT)
    expect(rows).toEqual(original)
  })
})

// ---------------------------------------------------------------------------
// sumTotalValue
// ---------------------------------------------------------------------------

describe('sumTotalValue', () => {
  it('retorna 0 para array vazio', () => {
    expect(sumTotalValue([])).toBe(0)
  })

  it('soma os total_value de todas as linhas', () => {
    const rows: DividendRow[] = [
      makeRow({ total_value: 150 }),
      makeRow({ total_value: 80 }),
      makeRow({ total_value: 200 }),
    ]
    expect(sumTotalValue(rows)).toBe(430)
  })

  it('soma reflete apenas as linhas passadas (pós-filtro)', () => {
    // Confirma que o total é recalculado com base nas linhas visíveis
    const allRows: DividendRow[] = [
      makeRow({ ticker: 'PETR4', total_value: 100 }),
      makeRow({ ticker: 'VALE3', total_value: 250 }),
    ]
    const filtered = filterAndSort(allRows, 'PETR', '', DEFAULT_SORT)
    expect(sumTotalValue(filtered)).toBe(100)
  })
})
