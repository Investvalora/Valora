import { describe, it, expect } from 'vitest'
import {
  applyBazin,
  calcAnnualDividend,
  calcBazinCeiling,
  calcMargin,
  sortBazinResults,
} from './bazinCalculation'
import type { DividendRaw } from '../../dividends/types'
import type { AssetCurrency, LatestQuote } from '../../portfolio/types'
import type { BazinResult } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function div(ticker: string, value: number, ex_date = '2026-06-01'): DividendRaw {
  return { ticker, type: 'dividend', ex_date, payment_date: null, value_per_share: value }
}

function quote(ticker: string, close: number): LatestQuote {
  return {
    ticker,
    close,
    source: 'brapi',
    date: '2026-09-11',
    updated_at: '2026-09-11T22:00:00Z',
  }
}

// ─── calcAnnualDividend ────────────────────────────────────────────────────────

describe('calcAnnualDividend', () => {
  it('soma os value_per_share do ticker', () => {
    const divs = [div('PETR4', 1.20), div('PETR4', 0.80), div('VALE3', 2.00)]
    expect(calcAnnualDividend('PETR4', divs)).toBeCloseTo(2.00)
  })

  it('retorna 0 quando não há registros para o ticker', () => {
    expect(calcAnnualDividend('BBAS3', [div('PETR4', 1.00)])).toBe(0)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcAnnualDividend('PETR4', [])).toBe(0)
  })

  it('ignora entradas com value_per_share não finito', () => {
    const divs = [div('PETR4', NaN), div('PETR4', Infinity), div('PETR4', 1.00)]
    expect(calcAnnualDividend('PETR4', divs)).toBeCloseTo(1.00)
  })

  it('soma dividendos de tipos variados (dividend + jcp)', () => {
    const divs = [
      { ...div('PETR4', 1.00), type: 'dividend' },
      { ...div('PETR4', 0.50), type: 'jcp' },
    ]
    expect(calcAnnualDividend('PETR4', divs)).toBeCloseTo(1.50)
  })
})

// ─── calcBazinCeiling ─────────────────────────────────────────────────────────

describe('calcBazinCeiling', () => {
  it('calcula corretamente: 2.40 / 0.06 = 40.00', () => {
    expect(calcBazinCeiling(2.40, 0.06)).toBeCloseTo(40.00)
  })

  it('retorna null quando annualDividend = 0', () => {
    expect(calcBazinCeiling(0, 0.06)).toBeNull()
  })

  it('retorna null quando annualDividend < 0', () => {
    expect(calcBazinCeiling(-1, 0.06)).toBeNull()
  })

  it('retorna null quando minDY = 0', () => {
    expect(calcBazinCeiling(2.40, 0)).toBeNull()
  })

  it('retorna null quando minDY < 0', () => {
    expect(calcBazinCeiling(2.40, -0.06)).toBeNull()
  })

  it('retorna null quando annualDividend é NaN', () => {
    expect(calcBazinCeiling(NaN, 0.06)).toBeNull()
  })

  it('retorna null quando minDY é Infinity', () => {
    expect(calcBazinCeiling(2.40, Infinity)).toBeNull()
  })

  it('aceita DY mínimo muito pequeno (DY = 1%)', () => {
    expect(calcBazinCeiling(1.00, 0.01)).toBeCloseTo(100.00)
  })
})

// ─── calcMargin ───────────────────────────────────────────────────────────────

describe('calcMargin', () => {
  it('margem positiva: cotação abaixo do teto', () => {
    // teto=40, cotação=35: (40-35)/35 * 100 ≈ 14.29%
    expect(calcMargin(40, 35)).toBeCloseTo(14.286, 2)
  })

  it('margem negativa: cotação acima do teto', () => {
    // teto=30, cotação=35: (30-35)/35 * 100 ≈ -14.29%
    expect(calcMargin(30, 35)).toBeCloseTo(-14.286, 2)
  })

  it('margem zero: cotação igual ao teto', () => {
    expect(calcMargin(40, 40)).toBeCloseTo(0)
  })

  it('retorna null quando ceilingPrice é null', () => {
    expect(calcMargin(null, 35)).toBeNull()
  })

  it('retorna null quando currentPrice é null', () => {
    expect(calcMargin(40, null)).toBeNull()
  })

  it('retorna null quando currentPrice = 0', () => {
    expect(calcMargin(40, 0)).toBeNull()
  })
})

// ─── applyBazin ──────────────────────────────────────────────────────────────

describe('applyBazin', () => {
  const divs = [div('PETR4', 1.20), div('PETR4', 1.20), div('VALE3', 2.00)]
  const quotes = [quote('PETR4', 35.00), quote('VALE3', 70.00)]
  const minDY = 0.06
  // Todos os tickers de teste são BRL — mapa vazio faz fallback para 'BRL'.
  const currencyMap = new Map<string, AssetCurrency>()
  const usdRate = 5.0

  it('happy path: calcula teto e margem para ativo com dados completos', () => {
    const result = applyBazin(['PETR4'], divs, quotes, minDY, currencyMap, usdRate)
    const r = result.get('PETR4')!
    expect(r.annualDividend).toBeCloseTo(2.40)
    expect(r.ceilingPrice).toBeCloseTo(40.00)
    expect(r.currentPrice).toBeCloseTo(35.00)
    expect(r.margin).toBeCloseTo(14.286, 2)
    expect(r.hasData).toBe(true)
    expect(r.currency).toBe('BRL')
  })

  it('N/A: ativo sem dividendos → hasData=false, ceilingPrice=null, margin=null', () => {
    const result = applyBazin(['BBAS3'], divs, quotes, minDY, currencyMap, usdRate)
    const r = result.get('BBAS3')!
    expect(r.annualDividend).toBe(0)
    expect(r.hasData).toBe(false)
    expect(r.ceilingPrice).toBeNull()
    expect(r.margin).toBeNull()
  })

  it('cotação ausente: teto calculado, currentPrice=null, margin=null', () => {
    const result = applyBazin(['VALE3'], divs, [], minDY, currencyMap, usdRate)
    const r = result.get('VALE3')!
    expect(r.ceilingPrice).toBeCloseTo(2.00 / 0.06, 2)
    expect(r.currentPrice).toBeNull()
    expect(r.margin).toBeNull()
    expect(r.hasData).toBe(true)
  })

  it('DY = 0: ceilingPrice e margin são null', () => {
    const result = applyBazin(['PETR4'], divs, quotes, 0, currencyMap, usdRate)
    const r = result.get('PETR4')!
    expect(r.ceilingPrice).toBeNull()
    expect(r.margin).toBeNull()
  })

  it('processa múltiplos tickers independentemente', () => {
    const result = applyBazin(['PETR4', 'VALE3', 'BBAS3'], divs, quotes, minDY, currencyMap, usdRate)
    expect(result.get('PETR4')!.hasData).toBe(true)
    expect(result.get('VALE3')!.hasData).toBe(true)
    expect(result.get('BBAS3')!.hasData).toBe(false)
  })

  it('retorna mapa vazio para lista de tickers vazia', () => {
    const result = applyBazin([], divs, quotes, minDY, currencyMap, usdRate)
    expect(result.size).toBe(0)
  })

  it('converte dividendos e cotação USD→BRL pelo usdRate', () => {
    const usdDivs = [div('AAPL', 0.24)]
    const usdQuotes = [quote('AAPL', 219.49)]
    const usdMap = new Map<string, AssetCurrency>([['AAPL', 'USD']])
    const rate = 5.15
    const result = applyBazin(['AAPL'], usdDivs, usdQuotes, minDY, usdMap, rate)
    const r = result.get('AAPL')!
    expect(r.annualDividend).toBeCloseTo(0.24 * rate, 4)
    expect(r.currentPrice).toBeCloseTo(219.49 * rate, 2)
    expect(r.currency).toBe('USD')
  })
})

// ─── sortBazinResults ─────────────────────────────────────────────────────────

describe('sortBazinResults', () => {
  function r(ticker: string, margin: number | null): BazinResult {
    return { ticker, currency: 'BRL', margin, annualDividend: 1, ceilingPrice: margin !== null ? 40 : null, currentPrice: 35, hasData: margin !== null }
  }

  it('ordena por margem decrescente', () => {
    const rows = [r('VALE3', 5), r('PETR4', 20), r('ITUB4', 10)]
    const sorted = sortBazinResults(rows)
    expect(sorted.map(x => x.ticker)).toEqual(['PETR4', 'ITUB4', 'VALE3'])
  })

  it('ativos N/A (margin null) ficam ao fim', () => {
    const rows = [r('BBAS3', null), r('PETR4', 15), r('VALE3', null)]
    const sorted = sortBazinResults(rows)
    expect(sorted[0].ticker).toBe('PETR4')
    expect(sorted[1].ticker).toBe('BBAS3') // alfabético entre nulls
    expect(sorted[2].ticker).toBe('VALE3')
  })

  it('desempate entre mesma margem por ticker', () => {
    const rows = [r('VALE3', 10), r('BBAS3', 10)]
    const sorted = sortBazinResults(rows)
    expect(sorted.map(x => x.ticker)).toEqual(['BBAS3', 'VALE3'])
  })

  it('não muta o array original', () => {
    const rows = [r('VALE3', 5), r('PETR4', 20)]
    const original = [...rows]
    sortBazinResults(rows)
    expect(rows[0].ticker).toBe(original[0].ticker)
  })
})
