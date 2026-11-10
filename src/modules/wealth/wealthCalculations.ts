import { INTERNATIONAL_TYPES } from '../portfolio/composition'
import type { WealthPoint, PositionSnapshot, PriceHistoryRow } from './types'

/** Seleciona a cotação válida mais recente de cada ticker, em qualquer ordem. */
export function buildLastPricesMap(priceRows: PriceHistoryRow[]): Map<string, number> {
  const latest = new Map<string, PriceHistoryRow>()
  for (const row of priceRows) {
    if (!Number.isFinite(Number(row.close))) continue
    const previous = latest.get(row.ticker)
    if (!previous || row.date > previous.date) latest.set(row.ticker, row)
  }
  return new Map([...latest].map(([ticker, row]) => [ticker, Number(row.close)]))
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
