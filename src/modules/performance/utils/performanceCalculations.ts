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
 * Calcula o retorno acumulado da carteira no período usando a fórmula
 * Modified Dietz simplificada:
 *
 * ```
 * retorno = (valorFinal + proventos − aportesMidPeriod) / valorInicial − 1
 * ```
 *
 * - `valorInicial`       = primeiro `WealthPoint.value` não-nulo da série.
 * - `valorFinal`         = último `WealthPoint.value` não-nulo da série.
 * - `proventos`          = Σ `dividendRow.total_value` (já filtrados pelo período no hook).
 * - `aportesMidPeriod`   = Σ custo das posições cuja `acquisition_date` é
 *                          **estritamente posterior** ao primeiro ponto da série.
 *
 * Posições presentes desde o primeiro dia já estão precificadas em
 * `valorInicial`, portanto não são subtraídas (evita dupla contagem).
 * Apenas entradas novas ocorridas depois do ponto inicial inflam `valorFinal`
 * sem contrapartida em `valorInicial` — essas sim precisam ser descontadas.
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

  // Aportes mid-period: apenas posições cuja acquisition_date é POSTERIOR ao
  // primeiro ponto da série. Posições presentes no dia do valorInicial já estão
  // incluídas nele — subtraí-las causaria dupla contagem no denominador.
  const periodStart = firstPoint.date
  const periodEnd = lastPoint.date

  const aportesMidPeriod = positions.reduce((acc, p) => {
    const d = p.acquisition_date
    if (d > periodStart && d <= periodEnd) {
      return acc + (p.average_price ?? 0) * (p.quantity ?? 0)
    }
    return acc
  }, 0)

  const retorno = (valorFinal + proventos - aportesMidPeriod) / valorInicial - 1
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
 * Filtra posições adicionadas dentro do período (acquisition_date entre periodStart e periodEnd).
 * Isso garante que a rentabilidade por ativo considere apenas posições que foram
 * efetivamente compradas no mês/período analisado.
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
  periodStart?: string,
  periodEnd?: string,
): AssetReturnRow[] {
  // Pré-computa proventos por ticker para O(n) em vez de O(n²)
  const dividendsByTicker = new Map<string, number>()
  for (const row of dividendRows) {
    const prev = dividendsByTicker.get(row.ticker) ?? 0
    dividendsByTicker.set(row.ticker, prev + row.total_value)
  }

  // Filtra posições pelo período, se especificado
  const filteredPositions = periodStart && periodEnd
    ? positions.filter((p) => {
        const acquisitionDate = p.acquisition_date
        return acquisitionDate >= periodStart && acquisitionDate <= periodEnd
      })
    : positions

  const rows: AssetReturnRow[] = filteredPositions.map((p) => {
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

// ---------------------------------------------------------------------------
// Helpers de mês
// ---------------------------------------------------------------------------

/** Extrai `YYYY-MM` de uma data ISO `YYYY-MM-DD`. */
function toYearMonth(date: string): string {
  return date.slice(0, 7)
}

/**
 * Dado um array de pontos `{date, value}` ordenados por data, retorna
 * o **último ponto de cada mês** (= último dia útil com dado disponível).
 *
 * Meses sem nenhum ponto são simplesmente ausentes do resultado.
 */
function lastPointPerMonth<T extends { date: string }>(
  points: T[],
): Map<string, T> {
  const map = new Map<string, T>()
  for (const p of points) {
    map.set(toYearMonth(p.date), p) // sobrescreve até o último do mês
  }
  return map
}

// ---------------------------------------------------------------------------
// computeMonthlyPortfolioReturns
// ---------------------------------------------------------------------------

/**
 * Calcula o retorno mensal da carteira para cada mês com dados.
 *
 * Algoritmo:
 * - Usa `wealthSeries` (já derivada por `buildWealthSeries`) e agrupa pelo
 *   último valor disponível de cada mês.
 * - Retorno do mês M = `valorFimM / valorFimM-1 − 1`.
 * - O primeiro mês não tem mês anterior → não gera retorno (é o ponto âncora).
 *
 * Retorna um Map de `YYYY-MM` → retorno decimal (ex: 0.034 = 3,4%).
 * Meses sem dado (valor null) são ignorados; o mês seguinte usa o último
 * valor válido como base.
 *
 * Exportado para testes unitários.
 */
export function computeMonthlyPortfolioReturns(
  wealthSeries: WealthPoint[],
): Map<string, number> {
  // Filtra pontos com valor válido antes de agrupar
  const validPoints = wealthSeries.filter(
    (p) => p.value !== null && Number.isFinite(p.value) && p.value > 0,
  ) as Array<{ date: string; value: number }>

  const byMonth = lastPointPerMonth(validPoints)
  const months = [...byMonth.keys()].sort()

  const returns = new Map<string, number>()
  for (let i = 1; i < months.length; i++) {
    const prev = byMonth.get(months[i - 1])!.value
    const curr = byMonth.get(months[i])!.value
    if (prev > 0) {
      returns.set(months[i], curr / prev - 1)
    }
  }
  return returns
}

// ---------------------------------------------------------------------------
// computeMonthlyBenchmarkReturns
// ---------------------------------------------------------------------------

/**
 * Calcula o retorno mensal de um benchmark a partir de suas linhas brutas.
 *
 * Mesmo algoritmo de `computeMonthlyPortfolioReturns`, mas recebe o array
 * de `BenchmarkRow` já filtrado para um único `name`.
 *
 * Retorna Map `YYYY-MM` → retorno decimal.
 *
 * Exportado para testes unitários.
 */
export function computeMonthlyBenchmarkReturns(
  rows: Array<{ date: string; value: number }>,
): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  const validRows = sorted.filter((r) => Number.isFinite(r.value) && r.value > 0)

  const byMonth = lastPointPerMonth(validRows)
  const months = [...byMonth.keys()].sort()

  const returns = new Map<string, number>()
  for (let i = 1; i < months.length; i++) {
    const prev = byMonth.get(months[i - 1])!.value
    const curr = byMonth.get(months[i])!.value
    if (prev > 0) {
      returns.set(months[i], curr / prev - 1)
    }
  }
  return returns
}

// ---------------------------------------------------------------------------
// buildMonthlyAccumulatedSeries
// ---------------------------------------------------------------------------

/**
 * Constrói uma `PerformanceSeries` acumulada mês a mês a partir de um
 * Map de retornos mensais.
 *
 * A série começa em `normalized = 100` no primeiro mês com retorno.
 * Cada mês seguinte: `acum[m] = acum[m-1] × (1 + retorno[m])`.
 *
 * O ponto plotado representa o **valor acumulado ao fim daquele mês**.
 * A data de cada ponto é `YYYY-MM-01` para consistência no eixo X.
 *
 * Retorna `PerformanceSeries` com `points: []` quando não há retornos.
 *
 * Exportado para testes unitários.
 */
export function buildMonthlyAccumulatedSeries(
  monthlyReturns: Map<string, number>,
  label: string,
  color: string,
): PerformanceSeries {
  const months = [...monthlyReturns.keys()].sort()
  if (months.length === 0) return { label, color, points: [] }

  const points: NormalizedPoint[] = []
  let acum = 100

  for (const month of months) {
    acum *= 1 + monthlyReturns.get(month)!
    points.push({ date: month + '-01', normalized: acum })
  }

  return { label, color, points }
}

// ---------------------------------------------------------------------------
// accumulatedReturnFromMonthly
// ---------------------------------------------------------------------------

/**
 * Extrai o retorno acumulado total a partir de um Map de retornos mensais:
 * `Π(1 + r_m) − 1`.
 *
 * Retorna `null` quando não há meses com retorno.
 *
 * Exportado para testes unitários.
 */
export function accumulatedReturnFromMonthly(
  monthlyReturns: Map<string, number>,
): number | null {
  if (monthlyReturns.size === 0) return null
  let acum = 1
  for (const r of monthlyReturns.values()) {
    acum *= 1 + r
  }
  return acum - 1
}

// ---------------------------------------------------------------------------
// buildIntramonthlySeries
// ---------------------------------------------------------------------------

/**
 * Fallback para quando há dados de apenas um mês (carteira recém-criada ou
 * período de 1M dentro do mesmo mês corrente).
 *
 * Em vez de comparar fim-de-mês contra fim-de-mês anterior, usa o primeiro
 * valor disponível como âncora (base 100) e mostra a evolução diária até o
 * último ponto — idêntico ao que o Investidor10 faz para o mês em andamento.
 *
 * Exportado para testes unitários.
 */
export function buildIntramonthlySeries(
  points: Array<{ date: string; value: number | null }>,
  label: string,
  color: string,
): PerformanceSeries {
  return { label, color, points: normalizeToBase100(points) }
}

/**
 * Constrói a série intra-mês de um benchmark filtrando as linhas pelo nome.
 *
 * Exportado para testes unitários.
 */
export function buildIntramonthlyBenchmarkSeries(
  rows: Array<{ date: string; name: string; value: number }>,
  name: string,
  label: string,
  color: string,
  since: string,
): PerformanceSeries {
  const filtered = rows
    .filter((r) => r.name === name && r.date >= since)
    .map((r) => ({ date: r.date, value: r.value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { label, color, points: normalizeToBase100(filtered) }
}

// ---------------------------------------------------------------------------
// computeMonthlyTableData  (tabela mês a mês estilo Investidor10)
// ---------------------------------------------------------------------------

/**
 * Uma linha da tabela de rentabilidade mês a mês.
 * - `year`: ano (ex: 2026)
 * - `months`: Map de `MM` → retorno decimal do mês (ex: '09' → 0.034)
 *   Meses sem dado ficam ausentes do Map.
 * - `annualReturn`: retorno anual composto = Π(1 + r_m) − 1
 * - `accumulatedReturn`: retorno acumulado desde o primeiro mês disponível
 *   de toda a série até o último mês deste ano
 */
export interface MonthlyTableRow {
  year: number
  months: Map<string, number>   // 'MM' → decimal
  annualReturn: number | null
  accumulatedReturn: number | null
}

/**
 * Constrói a tabela de rentabilidade mês a mês a partir do Map de retornos
 * mensais da carteira (`computeMonthlyPortfolioReturns`).
 *
 * - Agrupa por ano.
 * - `annualReturn` = produto dos retornos mensais do ano − 1.
 * - `accumulatedReturn` = produto de todos os retornos desde o início
 *   até o último mês do ano em questão − 1.
 *
 * Ordenado por ano decrescente (mais recente primeiro), igual ao Investidor10.
 *
 * Exportado para testes unitários.
 */
export function computeMonthlyTableData(
  monthlyReturns: Map<string, number>,
): MonthlyTableRow[] {
  if (monthlyReturns.size === 0) return []

  // Agrupa por ano
  const byYear = new Map<number, Map<string, number>>()
  for (const [ym, ret] of monthlyReturns) {
    const year = Number(ym.slice(0, 4))
    const month = ym.slice(5, 7)
    if (!byYear.has(year)) byYear.set(year, new Map())
    byYear.get(year)!.set(month, ret)
  }

  // Retorno acumulado progressivo (desde o início da série)
  const allMonths = [...monthlyReturns.keys()].sort()
  const accumulatedByMonth = new Map<string, number>()
  let running = 1
  for (const ym of allMonths) {
    running *= 1 + monthlyReturns.get(ym)!
    accumulatedByMonth.set(ym, running - 1)
  }

  const rows: MonthlyTableRow[] = []
  for (const [year, monthsMap] of byYear) {
    // Retorno anual = produto dos meses do ano
    let annual = 1
    for (const ret of monthsMap.values()) annual *= 1 + ret
    const annualReturn = annual - 1

    // Acumulado até o último mês do ano disponível na série
    const lastMonthOfYear = [...monthsMap.keys()].sort().pop()!
    const ym = `${year}-${lastMonthOfYear}`
    const accumulatedReturn = accumulatedByMonth.get(ym) ?? null

    rows.push({ year, months: monthsMap, annualReturn, accumulatedReturn })
  }

  // Mais recente primeiro
  rows.sort((a, b) => b.year - a.year)
  return rows
}
