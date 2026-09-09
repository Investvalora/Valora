import { businessDaysBetween, toIsoDate } from '../../shared/utils/isoDate'
import {
  LatestQuote,
  PositionRow,
  PositionSort,
  PositionWithAsset,
} from './types'

/**
 * Derivação da lista de posições: cotação, valor de mercado, peso e variação.
 *
 * Vive fora do componente por ser aritmética pura — o pai (`CarteiraPage`)
 * continua sendo quem a executa e quem conhece o total da carteira, mas o
 * cálculo é testável sem renderizar nada.
 */

/** A partir de quantos dias ÚTEIS de atraso o fechamento é sinalizado. */
export const STALE_QUOTE_DAYS = 1

/** Peso decrescente: a maior posição primeiro (AC da Story 2.3). */
export const DEFAULT_POSITION_SORT: PositionSort = { column: 'weight', direction: 'desc' }

/**
 * NUMERIC do Postgres pode chegar como string dependendo do serializador.
 *
 * String vazia é ilegível, não zero: `Number('')` é `0`, o que exibiria "0"
 * para um valor que ninguém informou — o mesmo defeito de `R$ NaN`, só mais
 * difícil de notar.
 */
export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN

  return Number(value)
}

export interface DerivePositionRowsInput {
  positions: PositionWithAsset[]
  quotes: LatestQuote[]
  /**
   * Taxa USD→BRL, ou `null` enquanto indisponível. Com `null`, posição em USD
   * fica sem valor de mercado em vez de ser somada como se fosse real.
   */
  usdRate: number | null
  /** Dia de referência da flag de cotação antiga. Default: hoje, fuso local. */
  today?: string
}

export interface DerivedPositions {
  rows: PositionRow[]
  /** Soma dos valores de mercado conhecidos, em BRL. */
  totalBRL: number
  /** Posições sem valor de mercado — o total não as inclui. */
  missingValueCount: number
  /** Alguma linha do total passou pela conversão USD. */
  usesUSDRate: boolean
}

function indexQuotes(quotes: LatestQuote[]): Map<string, LatestQuote> {
  const byTicker = new Map<string, LatestQuote>()

  for (const quote of quotes) {
    if (quote?.ticker) byTicker.set(quote.ticker, quote)
  }

  return byTicker
}

/**
 * Fechamento com mais de `STALE_QUOTE_DAYS` dia ÚTIL de atraso.
 *
 * Compara pela `date` do fechamento e não por `updated_at`: numa ingestão de
 * fim de semana a linha é recente e o preço é de sexta. Conta em dias úteis
 * para que sexta→segunda (0 pregões) não acenda alarme falso toda semana.
 * Data ilegível não é sinalizada como antiga — não há base para afirmar isso.
 */
function isStale(quoteDate: string, today: string): boolean {
  const age = businessDaysBetween(quoteDate, today)
  if (age === null) return false

  return age > STALE_QUOTE_DAYS
}

/** Variação da cotação sobre o preço médio, ambos na moeda do ativo. */
function computeChangePercent(quotePrice: number, averagePrice: number): number | null {
  if (!Number.isFinite(quotePrice) || !Number.isFinite(averagePrice)) return null
  // Preço médio zero é válido no cadastro (bonificação, por exemplo), mas não
  // admite variação percentual: dividir por zero produziria Infinity.
  if (averagePrice <= 0) return null

  return ((quotePrice - averagePrice) / averagePrice) * 100
}

export function derivePositionRows({
  positions,
  quotes,
  usdRate,
  today = toIsoDate(new Date()),
}: DerivePositionRowsInput): DerivedPositions {
  const quotesByTicker = indexQuotes(quotes)

  let totalBRL = 0
  let missingValueCount = 0
  let usesUSDRate = false

  const partial = positions.map((position) => {
    const quote = quotesByTicker.get(position.ticker) ?? null
    const quotePrice = quote ? toNumber(quote.close) : Number.NaN
    const quantity = toNumber(position.quantity)
    const averagePrice = toNumber(position.average_price)
    const currency = position.asset?.currency ?? null

    const needsUSDRate = currency === 'USD'
    const conversion = needsUSDRate ? usdRate : 1

    const hasValue =
      Number.isFinite(quotePrice) &&
      quotePrice > 0 &&
      Number.isFinite(quantity) &&
      conversion !== null &&
      Number.isFinite(conversion) &&
      (conversion as number) > 0

    const marketValueBRL = hasValue ? quantity * quotePrice * (conversion as number) : null

    if (marketValueBRL === null) {
      missingValueCount += 1
    } else {
      totalBRL += marketValueBRL
      if (needsUSDRate) usesUSDRate = true
    }

    return {
      id: position.id,
      ticker: position.ticker,
      name: position.asset?.name ?? null,
      currency,
      quantity,
      averagePrice,
      acquisitionDate: position.acquisition_date,
      quote,
      quotePrice,
      marketValueBRL,
      weightPercent: null,
      changePercent: computeChangePercent(quotePrice, averagePrice),
      isStaleQuote: quote ? isStale(quote.date, today) : false,
      usesUSDRate: needsUSDRate && marketValueBRL !== null,
    } satisfies PositionRow
  })

  // Segundo passo: o peso só existe depois do total. Com total zero não há
  // proporção definível — todas as linhas ficam sem peso, em vez de 0%.
  const rows = partial.map((row) => ({
    ...row,
    weightPercent:
      row.marketValueBRL === null || totalBRL <= 0 ? null : (row.marketValueBRL / totalBRL) * 100,
  }))

  return { rows, totalBRL, missingValueCount, usesUSDRate }
}

/**
 * Comparador que empurra o indefinido para o fim em qualquer direção: uma linha
 * sem cotação não é "a menor" nem "a maior", e alternar a ordenação não deveria
 * fazê-la disputar o topo com as que têm dado.
 */
function compareNullableNumbers(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  return (a - b) * direction
}

/** Nova lista ordenada — o array de entrada não é mutado. */
export function sortPositionRows(rows: PositionRow[], sort: PositionSort): PositionRow[] {
  const direction = sort.direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const primary =
      sort.column === 'ticker'
        ? a.ticker.localeCompare(b.ticker, 'pt-BR') * direction
        : sort.column === 'weight'
          ? compareNullableNumbers(a.weightPercent, b.weightPercent, direction)
          : compareNullableNumbers(a.changePercent, b.changePercent, direction)

    // Desempate estável por ticker: sem ele, duas posições de mesmo peso
    // trocam de lugar entre renders e a lista "pisca" sem motivo.
    return primary !== 0 ? primary : a.ticker.localeCompare(b.ticker, 'pt-BR')
  })
}

/** Direção inicial de cada coluna quando o usuário passa a ordenar por ela. */
const INITIAL_DIRECTION: Record<PositionSort['column'], PositionSort['direction']> = {
  ticker: 'asc',
  weight: 'desc',
  change: 'desc',
}

/** Clique no header: inverte se já é a coluna ativa, senão adota a coluna. */
export function nextSort(current: PositionSort, column: PositionSort['column']): PositionSort {
  if (current.column !== column) return { column, direction: INITIAL_DIRECTION[column] }

  return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
