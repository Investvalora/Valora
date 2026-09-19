import type { DividendRaw } from '../../dividends/types'
import type { AssetCurrency, LatestQuote } from '../../portfolio/types'
import type { BazinByTicker, BazinResult } from '../types'

/**
 * Soma os `value_per_share` de um ticker nos dividendos fornecidos.
 *
 * - Filtra pelo ticker exato (case-sensitive, como no banco).
 * - Apenas registros com `value_per_share > 0` chegam aqui (filtrado no service).
 * - Retorna 0 quando não há registros para o ticker.
 * - O valor retornado está na moeda do ativo (USD ou BRL); conversão feita em `applyBazin`.
 */
export function calcAnnualDividend(ticker: string, dividends: DividendRaw[]): number {
  let sum = 0
  for (const d of dividends) {
    if (d.ticker === ticker) {
      const v = Number(d.value_per_share)
      if (Number.isFinite(v) && v > 0) sum += v
    }
  }
  return sum
}

/**
 * Calcula o preço-teto Bazin: `annualDividend / minDY`.
 *
 * Retorna `null` para entradas inválidas:
 * - `annualDividend <= 0` ou não finito (ativo sem dividendos — exibe "N/A").
 * - `minDY <= 0` ou não finito (input inválido do usuário).
 */
export function calcBazinCeiling(
  annualDividend: number,
  minDY: number,
): number | null {
  if (!Number.isFinite(annualDividend) || annualDividend <= 0) return null
  if (!Number.isFinite(minDY) || minDY <= 0) return null
  const result = annualDividend / minDY
  // Guard contra overflow: minDY muito pequeno pode produzir Infinity
  if (!Number.isFinite(result)) return null
  return result
}

/**
 * Calcula a margem de segurança: `((ceilingPrice − currentPrice) / currentPrice) × 100`.
 *
 * Retorna `null` quando qualquer entrada é nula ou inválida.
 */
export function calcMargin(
  ceilingPrice: number | null,
  currentPrice: number | null,
): number | null {
  if (ceilingPrice === null || currentPrice === null) return null
  if (!Number.isFinite(ceilingPrice) || !Number.isFinite(currentPrice)) return null
  if (currentPrice <= 0) return null
  return ((ceilingPrice - currentPrice) / currentPrice) * 100
}

/**
 * Aplica o cálculo Bazin para todos os tickers fornecidos.
 *
 * Função pura: sem I/O, sem efeitos colaterais, sem lançamento de exceções.
 *
 * Para cada ticker:
 * - Soma `value_per_share` dos dividendos dos últimos 12 meses.
 * - Converte para BRL quando a moeda do ativo é USD (multiplica por `usdRate`).
 * - Calcula preço-teto com o DY mínimo informado.
 * - Obtém cotação atual do Map de quotes e converte para BRL se necessário.
 * - Calcula margem de segurança.
 *
 * @param currencyByTicker  Map ticker → 'BRL'|'USD'. Tickers ausentes assumem 'BRL'.
 * @param usdRate           Taxa de câmbio USD/BRL (ex.: 5.15). Deve ser > 0 e finito.
 */
export function applyBazin(
  tickers: string[],
  dividends: DividendRaw[],
  quotes: LatestQuote[],
  minDY: number,
  currencyByTicker: Map<string, AssetCurrency>,
  usdRate: number,
): BazinByTicker {
  const result: BazinByTicker = new Map()

  // Garantia defensiva: taxa inválida cai para 1 (não converte, melhor do que NaN).
  const rate = Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 1

  const quoteByTicker = new Map<string, number>()
  for (const q of quotes) {
    const price = Number(q.close)
    if (q.ticker && Number.isFinite(price) && price > 0) {
      quoteByTicker.set(q.ticker, price)
    }
  }

  for (const ticker of tickers) {
    const currency: AssetCurrency = currencyByTicker.get(ticker) ?? 'BRL'
    const fx = currency === 'USD' ? rate : 1

    // Dividendo em moeda local → convertido para BRL
    const annualDividendLocal = calcAnnualDividend(ticker, dividends)
    const annualDividend = annualDividendLocal * fx

    const hasData = annualDividend > 0
    const ceilingPrice = calcBazinCeiling(annualDividend, minDY)

    // Cotação em moeda local → convertida para BRL
    const rawPrice = quoteByTicker.get(ticker) ?? null
    const currentPrice = rawPrice !== null ? rawPrice * fx : null

    const margin = calcMargin(ceilingPrice, currentPrice)

    result.set(ticker, { ticker, currency, annualDividend, ceilingPrice, currentPrice, margin, hasData })
  }

  return result
}

/**
 * Ordena os resultados Bazin para exibição na tabela:
 * - Ativos com margem definida primeiro, ordem decrescente (oportunidades no topo).
 * - Ativos sem margem (N/A) sempre ao fim.
 * - Desempate por ticker (ordem alfabética).
 */
export function sortBazinResults(results: BazinResult[]): BazinResult[] {
  return [...results].sort((a, b) => {
    if (a.margin === null && b.margin === null) {
      return a.ticker.localeCompare(b.ticker, 'pt-BR')
    }
    if (a.margin === null) return 1
    if (b.margin === null) return -1
    const diff = b.margin - a.margin
    return diff !== 0 ? diff : a.ticker.localeCompare(b.ticker, 'pt-BR')
  })
}

import { calcGrahamPrice, calcGrahamMargin } from './grahamCalculation'
import type { FundamentalsRow } from '../../score/types'
import type { GrahamByTicker, GrahamResult } from '../types'

/**
 * Aplica o cálculo Graham para todos os tickers fornecidos.
 *
 * Função pura: sem I/O, sem efeitos colaterais, sem lançamento de exceções.
 *
 * Para cada ticker:
 * - Obtém LPA e VPA de `fundamentals` (registro mais recente por ticker).
 * - Calcula Preço Justo = √(22,5 × LPA × VPA) na moeda do ativo.
 * - Converte Preço Justo e cotação para BRL quando a moeda é USD.
 * - Calcula margem de segurança ((grahamPrice − currentPrice) / currentPrice × 100).
 *
 * @param currencyByTicker  Map ticker → 'BRL'|'USD'.
 * @param usdRate           Taxa de câmbio USD/BRL. Deve ser > 0 e finito.
 */
export function applyGraham(
  tickers: string[],
  fundamentals: FundamentalsRow[],
  quotes: LatestQuote[],
  currencyByTicker: Map<string, AssetCurrency>,
  usdRate: number,
): GrahamByTicker {
  const result: GrahamByTicker = new Map()

  const rate = Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 1

  const fundsByTicker = new Map<string, FundamentalsRow>()
  for (const f of fundamentals) {
    if (!fundsByTicker.has(f.ticker)) fundsByTicker.set(f.ticker, f)
  }

  const quoteByTicker = new Map<string, number>()
  for (const q of quotes) {
    const price = Number(q.close)
    if (q.ticker && Number.isFinite(price) && price > 0) {
      quoteByTicker.set(q.ticker, price)
    }
  }

  for (const ticker of tickers) {
    const currency: AssetCurrency = currencyByTicker.get(ticker) ?? 'BRL'
    const fx = currency === 'USD' ? rate : 1

    const fund = fundsByTicker.get(ticker)
    const lpa = fund?.lpa ?? null
    const vpa = fund?.vpa ?? null

    // Graham é calculado na moeda do ativo (LPA e VPA são relativos entre si)
    // e depois convertido para BRL para comparação com a cotação em BRL.
    const grahamPriceLocal = calcGrahamPrice(lpa, vpa)
    const grahamPrice = grahamPriceLocal !== null ? grahamPriceLocal * fx : null

    const rawPrice = quoteByTicker.get(ticker) ?? null
    const currentPrice = rawPrice !== null ? rawPrice * fx : null

    const margin = calcGrahamMargin(grahamPrice, currentPrice)
    const hasData = grahamPrice !== null

    result.set(ticker, { ticker, currency, grahamPrice, currentPrice, margin, lpa, vpa, hasData })
  }

  return result
}

/**
 * Ordena os resultados Graham para exibição na tabela:
 * - Ativos com margem definida primeiro, ordem decrescente (oportunidades no topo).
 * - Ativos sem dado (N/A) sempre ao fim.
 * - Desempate por ticker (ordem alfabética).
 */
export function sortGrahamResults(results: GrahamResult[]): GrahamResult[] {
  return [...results].sort((a, b) => {
    if (a.margin === null && b.margin === null) {
      return a.ticker.localeCompare(b.ticker, 'pt-BR')
    }
    if (a.margin === null) return 1
    if (b.margin === null) return -1
    const diff = b.margin - a.margin
    return diff !== 0 ? diff : a.ticker.localeCompare(b.ticker, 'pt-BR')
  })
}
