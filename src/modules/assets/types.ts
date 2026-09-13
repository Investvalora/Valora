/** Ponto de preço para o gráfico de histórico do ativo. */
export interface PricePoint {
  /** Data no formato `YYYY-MM-DD`. */
  date: string
  /** Fechamento na moeda do ativo. `null` indica lacuna (sem pregão naquele dia). */
  close: number | null
}
