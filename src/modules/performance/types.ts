import type { WealthPeriod } from '../wealth/types'

/** Períodos disponíveis na tela Rentabilidade — mesmos de WealthPeriod. */
export type PerformancePeriod = WealthPeriod

// ---------------------------------------------------------------------------
// Story 4.2 — Rentabilidade por Ativo
// ---------------------------------------------------------------------------

/**
 * Linha da tabela de rentabilidade por ativo.
 * Valores `null` são exibidos como "—" na UI (divisão por zero ou dado ausente).
 */
export interface AssetReturnRow {
  ticker: string
  /** Nome do ativo, nulo quando o catálogo não retornou a linha. */
  name: string | null
  /**
   * Retorno total % = ganho de capital % + proventos %.
   * `null` quando ambos os componentes são nulos.
   */
  totalReturnPct: number | null
  /**
   * Ganho de capital % = ((cotação atual − preço médio) / preço médio) × 100.
   * `null` quando cotação ausente ou preço médio = 0.
   */
  capitalGainPct: number | null
  /** Soma de `value_per_share × quantity` para o ticker no período (em BRL). */
  dividendsReceived: number
  /**
   * Proventos % = (dividendsReceived / (preço médio × quantidade)) × 100.
   * `null` quando preço médio = 0 ou quantidade = 0.
   */
  dividendsPct: number | null
}

/** Colunas disponíveis para ordenação da tabela de rentabilidade por ativo. */
export type AssetReturnSortColumn =
  | 'ticker'
  | 'totalReturnPct'
  | 'capitalGainPct'
  | 'dividendsReceived'
  | 'dividendsPct'

export interface AssetReturnSort {
  column: AssetReturnSortColumn
  direction: 'asc' | 'desc'
}

/** Linha crua da tabela `benchmarks`. */
export interface BenchmarkRow {
  /** Nome do benchmark: 'CDI' | 'IBOV' | 'IFIX'. */
  name: string
  /** Data no formato `YYYY-MM-DD`. */
  date: string
  /** Valor do índice naquele dia (ex: CDI acumulado base 100, pontos do IBOV). */
  value: number
  /** Procedência: 'seed' para dados simulados. */
  source: string
}

/**
 * Ponto de uma série normalizada para comparação visual.
 * Todas as séries partem de `normalized = 100` no início do período.
 */
export interface NormalizedPoint {
  /** Data no formato `YYYY-MM-DD`. */
  date: string
  /** Valor normalizado (100 = início do período). */
  normalized: number
}

/**
 * Série de um ativo/benchmark para o gráfico de linhas.
 */
export interface PerformanceSeries {
  /** Rótulo exibido na legenda e no tooltip. */
  label: string
  /** Cor da linha em HEX. */
  color: string
  /** Pontos normalizados da série. */
  points: NormalizedPoint[]
}

/**
 * Resumo de retorno para os cards da tela.
 * `null` quando dados insuficientes para calcular.
 */
export interface PerformanceSummary {
  /** Retorno acumulado da carteira no período (ex: 0.15 = 15%). */
  portfolioReturnPct: number | null
  /** Retorno acumulado do CDI no período. */
  cdiReturnPct: number | null
  /** Retorno acumulado do IBOV no período. */
  ibovReturnPct: number | null
  /** Retorno acumulado do IFIX no período. */
  ifixReturnPct: number | null
  /**
   * Spread da carteira vs CDI em pontos percentuais.
   * `null` quando qualquer dos dois retornos é nulo.
   */
  vscdipPp: number | null
}
