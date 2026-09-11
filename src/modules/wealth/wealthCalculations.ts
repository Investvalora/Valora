import { INTERNATIONAL_TYPES } from '../portfolio/composition'
import type { WealthPoint, PositionSnapshot, PriceHistoryRow } from './types'

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
 * Exportado para ser testável de forma isolada.
 */
export function buildWealthSeries(
  positions: PositionSnapshot[],
  priceRows: PriceHistoryRow[],
  usdRate: number,
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

  // Agrupa cotações por data → Map<date, Map<ticker, close>>
  const byDate = new Map<string, Map<string, number>>()
  for (const row of priceRows) {
    const key = String(row.date).slice(0, 10)
    let dayMap = byDate.get(key)
    if (!dayMap) {
      dayMap = new Map()
      byDate.set(key, dayMap)
    }
    dayMap.set(row.ticker, Number(row.close))
  }

  // Coleta as datas ordenadas
  const dates = [...byDate.keys()].sort()

  return dates.map((date) => {
    const dayMap = byDate.get(date)!
    let total = 0
    let hasAny = false

    for (const [ticker, { quantity, needsConversion }] of posMap.entries()) {
      const close = dayMap.get(ticker)
      if (close === undefined || !Number.isFinite(close)) continue

      hasAny = true
      const priceInBRL = needsConversion ? close * usdRate : close
      total += priceInBRL * quantity
    }

    return { date, value: hasAny ? total : null }
  })
}
