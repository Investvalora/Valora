import type { DividendRaw } from '../../dividends/types'
import type { LatestQuote } from '../../portfolio/types'
import type { BazinByTicker, BazinResult } from '../types'

/**
 * Soma os `value_per_share` de um ticker nos dividendos fornecidos.
 *
 * - Filtra pelo ticker exato (case-sensitive, como no banco).
 * - Apenas registros com `value_per_share > 0` chegam aqui (filtrado no service).
 * - Retorna 0 quando não há registros para o ticker.
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
 * - Calcula preço-teto com o DY mínimo informado.
 * - Obtém cotação atual do Map de quotes.
 * - Calcula margem de segurança.
 */
export function applyBazin(
  tickers: string[],
  dividends: DividendRaw[],
  quotes: LatestQuote[],
  minDY: number,
): BazinByTicker {
  const result: BazinByTicker = new Map()

  const quoteByTicker = new Map<string, number>()
  for (const q of quotes) {
    const price = Number(q.close)
    if (q.ticker && Number.isFinite(price) && price > 0) {
      quoteByTicker.set(q.ticker, price)
    }
  }

  for (const ticker of tickers) {
    const annualDividend = calcAnnualDividend(ticker, dividends)
    const hasData = annualDividend > 0
    const ceilingPrice = calcBazinCeiling(annualDividend, minDY)
    const currentPrice = quoteByTicker.get(ticker) ?? null
    const margin = calcMargin(ceilingPrice, currentPrice)

    result.set(ticker, { ticker, annualDividend, ceilingPrice, currentPrice, margin, hasData })
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
