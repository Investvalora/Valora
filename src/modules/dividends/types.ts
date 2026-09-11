/** Períodos de análise disponíveis na tela Proventos. Subconjunto de WealthPeriod. */
export type DividendPeriod = '6M' | '1A' | 'Tudo'

/**
 * Linha crua retornada pelo `dividendService`, diretamente da tabela `dividends`.
 * `value_per_share` é NUMERIC no Postgres e pode chegar como string.
 */
export interface DividendRaw {
  ticker: string
  /** Tipo do provento: `dividend`, `jcp`, etc. */
  type: string
  /** Data COM — data-base de referência para o direito ao provento. `YYYY-MM-DD`. */
  ex_date: string
  /** Data de pagamento. `YYYY-MM-DD`. */
  payment_date: string | null
  /** Valor do provento por cota/ação. */
  value_per_share: number
}

/**
 * Linha enriquecida do cliente: acrescenta a quantidade atual da posição do
 * usuário e o valor total recebido (calculado client-side).
 */
export interface DividendRow extends DividendRaw {
  /** Quantidade atual da posição do usuário no ticker. */
  quantity: number
  /** `value_per_share × quantity` em BRL. */
  total_value: number
}

/** Barra do gráfico mensal de proventos. */
export interface MonthlyBar {
  /** Mês no formato `YYYY-MM`. */
  month: string
  /** Soma dos `total_value` de todas as linhas daquele mês. */
  total: number
}

/** Colunas disponíveis para ordenação da tabela de proventos. */
export type DividendSortColumn = 'ex_date' | 'total_value' | 'ticker'

export interface DividendSort {
  column: DividendSortColumn
  direction: 'asc' | 'desc'
}
