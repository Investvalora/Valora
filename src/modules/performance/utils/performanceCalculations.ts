import type { WealthPoint } from '../../wealth/types'
import type { DividendRow } from '../../dividends/types'
import type { PositionWithAsset } from '../../portfolio/types'
import type { BenchmarkRow, NormalizedPoint, PerformanceSeries, AssetReturnRow } from '../types'

// ---------------------------------------------------------------------------
// normalizeToBase100
// ---------------------------------------------------------------------------

/**
 * Recebe uma série de pontos `{date, value}` e retorna cada ponto com
 * `normalized = (value / firstValue) × 100`.
 *
 * - Se a série está vazia → retorna `[]`.
 * - O primeiro valor nulo ou zero é pulado ao buscar a âncora: o primeiro
 *   ponto com `value > 0` define a base 100. Pontos anteriores à âncora
 *   são descartados.
 * - Pontos com `value = null` (gaps) são mantidos com `normalized = null`
 *   para que o gráfico possa renderizar lacunas.
 *
 * Exportado para testes unitários.
 */
export function normalizeToBase100(
  points: Array<{ date: string; value: number | null }>,
): NormalizedPoint[] {
  // Encontra o primeiro valor positivo (âncora da base 100)
  const anchorIndex = points.findIndex((p) => p.value !== null && p.value > 0)
  if (anchorIndex === -1) return []

  const anchor = points[anchorIndex].value as number

  return points.slice(anchorIndex).map((p) => ({
    date: p.date,
    normalized: p.value !== null ? (p.value / anchor) * 100 : (null as unknown as number),
  }))
}

// ---------------------------------------------------------------------------
// computePortfolioReturn
// ---------------------------------------------------------------------------

/**
 * Calcula o retorno acumulado da carteira no período:
 *
 * ```
 * retorno = ((valorFinal + proventos − aportes) / valorInicial) − 1
 * ```
 *
 * - `valorInicial` = primeiro `WealthPoint.value` não-nulo da série.
 * - `valorFinal`   = último `WealthPoint.value` não-nulo da série.
 * - `proventos`    = Σ `dividendRow.total_value` (já filtrados pelo período no hook).
 * - `aportes`      = Σ `position.average_price × position.quantity`.
 *
 * Retorna `null` quando:
 * - A série está vazia ou todos os pontos são `null`.
 * - `valorInicial === 0` (divisão por zero).
 * - O denominador (`valorInicial`) é não-finito.
 *
 * Exportado para testes unitários.
 */
export function computePortfolioReturn(
  wealthSeries: WealthPoint[],
  dividendRows: DividendRow[],
  positions: PositionWithAsset[],
): number | null {
  // valorInicial = primeiro ponto não-nulo
  const firstPoint = wealthSeries.find((p) => p.value !== null && Number.isFinite(p.value))
  // valorFinal = último ponto não-nulo
  const lastPoint = [...wealthSeries].reverse().find((p) => p.value !== null && Number.isFinite(p.value))

  if (!firstPoint || !lastPoint) return null

  const valorInicial = firstPoint.value as number
  const valorFinal = lastPoint.value as number

  if (valorInicial <= 0 || !Number.isFinite(valorInicial)) return null

  // Proventos: soma dos total_value das linhas de dividendos do período
  const proventos = dividendRows.reduce((acc, r) => acc + (r.total_value ?? 0), 0)

  // Aportes: custo médio total das posições atuais
  const aportes = positions.reduce(
    (acc, p) => acc + (p.average_price ?? 0) * (p.quantity ?? 0),
    0,
  )

  const retorno = (valorFinal + proventos - aportes) / valorInicial - 1
  return Number.isFinite(retorno) ? retorno : null
}

// ---------------------------------------------------------------------------
// buildBenchmarkSeries
// ---------------------------------------------------------------------------

/**
 * Agrupa os `BenchmarkRow[]` por `name` e constrói uma `PerformanceSeries`
 * normalizada a 100 para cada benchmark.
 *
 * Benchmarks sem nenhum dado no período retornam série vazia (`points: []`).
 */
export function buildBenchmarkSeries(
  rows: BenchmarkRow[],
  config: Array<{ name: string; label: string; color: string }>,
): PerformanceSeries[] {
  // Agrupa por name
  const byName = new Map<string, Array<{ date: string; value: number | null }>>()
  for (const row of rows) {
    if (!byName.has(row.name)) byName.set(row.name, [])
    byName.get(row.name)!.push({ date: row.date, value: Number(row.value) })
  }

  return config.map(({ name, label, color }) => {
    const rawPoints = byName.get(name) ?? []
    const points = normalizeToBase100(rawPoints)
    return { label, color, points }
  })
}

// ---------------------------------------------------------------------------
// extractReturnPct
// ---------------------------------------------------------------------------

/**
 * Extrai o retorno acumulado de uma série normalizada:
 * `(últimoNormalized / 100) − 1`.
 *
 * Retorna `null` para séries vazias ou último ponto nulo.
 */
export function extractReturnPct(series: PerformanceSeries): number | null {
  const last = series.points.length > 0 ? series.points[series.points.length - 1] : undefined
  if (!last || last.normalized === null) return null
  return last.normalized / 100 - 1
}


// ---------------------------------------------------------------------------
// computeAssetRows  (Story 4.2)
// ---------------------------------------------------------------------------

/**
 * Deriva as linhas da tabela de Rentabilidade por Ativo.
 *
 * Para cada posição calcula:
 * - `capitalGainPct` = `((cotação atual − preço médio) / preço médio) × 100`
 *   → `null` quando cotação ausente **ou** `average_price = 0`.
 * - `dividendsReceived` = Σ `value_per_share × quantity` de `dividendRows`
 *   filtrados pelo ticker. Zero é um resultado legítimo (nenhum provento).
 * - `dividendsPct` = `(dividendsReceived / (average_price × quantity)) × 100`
 *   → `null` quando `average_price = 0` ou `quantity = 0`.
 * - `totalReturnPct` = `(capitalGainPct ?? 0) + (dividendsPct ?? 0)`
 *   → `null` quando **ambos** os componentes são `null`.
 *
 * A lista é ordenada por `totalReturnPct` decrescente por padrão.
 * Linhas com `totalReturnPct = null` vão ao final.
 *
 * Exportado para testes unitários.
 */
export function computeAssetRows(
  positions: PositionWithAsset[],
  lastPricesMap: Map<string, number>,
  dividendRows: DividendRow[],
): AssetReturnRow[] {
  // Pré-computa proventos por ticker para O(n) em vez de O(n²)
  const dividendsByTicker = new Map<string, number>()
  for (const row of dividendRows) {
    const prev = dividendsByTicker.get(row.ticker) ?? 0
    dividendsByTicker.set(row.ticker, prev + row.total_value)
  }

  const rows: AssetReturnRow[] = positions.map((p) => {
    const avgPrice = p.average_price ?? 0
    const qty = p.quantity ?? 0
    const name = p.asset?.name ?? null

    // Cotação atual — null quando não disponível
    const currentPrice = lastPricesMap.get(p.ticker) ?? null

    // Ganho de capital
    const capitalGainPct =
      currentPrice !== null && avgPrice > 0
        ? ((currentPrice - avgPrice) / avgPrice) * 100
        : null

    // Proventos recebidos (0 é resultado válido — não é ausência)
    const dividendsReceived = dividendsByTicker.get(p.ticker) ?? 0

    // Proventos %
    const dividendsPct =
      avgPrice > 0 && qty > 0
        ? (dividendsReceived / (avgPrice * qty)) * 100
        : null

    // Retorno total
    const totalReturnPct =
      capitalGainPct !== null || dividendsPct !== null
        ? (capitalGainPct ?? 0) + (dividendsPct ?? 0)
        : null

    return {
      ticker: p.ticker,
      name,
      totalReturnPct,
      capitalGainPct,
      dividendsReceived,
      dividendsPct,
    }
  })

  // Ordena por retorno total decrescente; nulls vão ao final
  rows.sort((a, b) => {
    if (a.totalReturnPct === null && b.totalReturnPct === null) return 0
    if (a.totalReturnPct === null) return 1
    if (b.totalReturnPct === null) return -1
    return b.totalReturnPct - a.totalReturnPct
  })

  return rows
}
