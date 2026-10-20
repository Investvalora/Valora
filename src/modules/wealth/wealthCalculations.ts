import { INTERNATIONAL_TYPES } from '../portfolio/composition'
import type { WealthPoint, PositionSnapshot, PriceHistoryRow } from './types'
import type { Transaction } from '../portfolio/services/transactionsService'

/**
 * Constrói o mapa de último preço conhecido por ticker.
 *
 * Os rows chegam ordenados por `date ASC` (order do service). Iterando de trás
 * para frente, o primeiro preço encontrado para cada ticker é o mais recente.
 *
 * Exportado para ser testável de forma isolada.
 */
export function buildLastPricesMap(priceRows: PriceHistoryRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = priceRows.length - 1; i >= 0; i--) {
    const row = priceRows[i]
    if (!map.has(row.ticker) && Number.isFinite(Number(row.close))) {
      map.set(row.ticker, Number(row.close))
    }
  }
  return map
}

/**
 * Monta a série temporal de patrimônio a partir das posições e do histórico.
 *
 * Abordagem permissiva (spec §Design Notes):
 * - Para cada dia com ALGUM dado em `price_history`, soma os tickers que têm
 *   cotação naquele dia.
 * - Dias sem nenhum dado → `value = null` (gap total).
 * - Tickers sem cotação num dia específico → excluídos da soma daquele dia
 *   (não geram gap artificial).
 *
 * Conversão USD → BRL: ativos internacionais com `currency = 'USD'`
 * têm seu close multiplicado pela taxa.
 *
 * `earliestDate` (opcional): quando informado, pontos anteriores a essa data
 * são removidos da série. Garante que o gráfico nunca mostre patrimônio
 * retroativo a períodos em que o investidor ainda não tinha os ativos.
 *
 * Exportado para ser testável de forma isolada.
 */
export function buildWealthSeries(
  positions: PositionSnapshot[],
  priceRows: PriceHistoryRow[],
  usdRate: number,
  earliestDate?: string,
  transactions: Transaction[] = [],
): WealthPoint[] {
  if (positions.length === 0) return []
  if (priceRows.length === 0) return []

  // Índice: ticker → { quantity, needsConversion }
  const posMap = new Map<string, { quantity: number; needsConversion: boolean }>()
  for (const pos of positions) {
    const needsConversion =
      pos.currency === 'USD' &&
      pos.type !== null &&
      (INTERNATIONAL_TYPES as readonly string[]).includes(pos.type)
    posMap.set(pos.ticker, { quantity: pos.quantity, needsConversion })
  }

  const transactionsByTicker = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    if (transaction.type !== 'buy' && transaction.type !== 'sell') continue
    const tickerTransactions = transactionsByTicker.get(transaction.ticker) ?? []
    tickerTransactions.push(transaction)
    transactionsByTicker.set(transaction.ticker, tickerTransactions)
  }
  for (const tickerTransactions of transactionsByTicker.values()) {
    tickerTransactions.sort((a, b) => {
      const dateOrder = a.transaction_date.localeCompare(b.transaction_date)
      return dateOrder !== 0 ? dateOrder : a.seq - b.seq
    })
  }

  // Agrupa cotações por data → Map<date, Map<ticker, close>>
  const byDate = new Map<string, Map<string, number>>()
  for (const row of priceRows) {
    const key = String(row.date).slice(0, 10)
    // Descartar pontos anteriores à primeira compra (defesa dupla: o hook
    // já filtra o since, mas dados em cache podem ter range maior)
    if (earliestDate && key < earliestDate) continue
    let dayMap = byDate.get(key)
    if (!dayMap) {
      dayMap = new Map()
      byDate.set(key, dayMap)
    }
    dayMap.set(row.ticker, Number(row.close))
  }

  // Coleta as datas ordenadas
  const dates = [...byDate.keys()].sort()
  const lastCloseByTicker = new Map<string, number>()

  return dates.map((date) => {
    const dayMap = byDate.get(date)!
    let total = 0
    let hasAny = false

    for (const [ticker, { quantity, needsConversion }] of posMap.entries()) {
      const dayClose = dayMap.get(ticker)
      if (dayClose !== undefined && Number.isFinite(dayClose)) {
        lastCloseByTicker.set(ticker, dayClose)
      }
      const close = lastCloseByTicker.get(ticker)
      if (close === undefined) continue

      const tickerTransactions = transactionsByTicker.get(ticker)
      let quantityAtDate = quantity
      if (tickerTransactions && tickerTransactions.length > 0) {
        quantityAtDate = 0
        for (const transaction of tickerTransactions) {
          if (transaction.transaction_date > date) break
          quantityAtDate += transaction.type === 'buy' ? transaction.quantity : -transaction.quantity
        }
        quantityAtDate = Math.max(0, quantityAtDate)
      }

      if (quantityAtDate <= 0) continue
      hasAny = true
      const priceInBRL = needsConversion ? close * usdRate : close
      total += priceInBRL * quantityAtDate
    }

    return { date, value: hasAny ? total : null }
  })
}
