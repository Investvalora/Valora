import type { WealthPeriod } from '../wealth/types'

/** Períodos disponíveis na tela Rentabilidade — mesmos de WealthPeriod. */
export type PerformancePeriod = WealthPeriod

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
