/** Períodos de análise disponíveis na tela Proventos. Subconjunto de WealthPeriod. */
export type DividendPeriod = '6M' | '1A' | 'Tudo'

import type { AssetType } from '../portfolio/types'

/**
 * Linha crua retornada pelo `dividendService`, diretamente da tabela `dividends`.
 * `value_per_share` é NUMERIC no Postgres e pode chegar como string.
 */
export interface DividendRaw {
  ticker: string
  /** Tipo do provento: `dividend`, `jcp`, etc. */
  type: string
  /** Primeiro dia ex-direito. É necessário possuir o ativo antes desta data. */
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
  /** Imported rows display record_date (Data COM) in the common date column. */
  source?: 'imported'
  record_date?: string | null
  gross_amount?: number
  /** Quantidade atual da posição do usuário no ticker. */
  quantity: number
  /** Total líquido importado, ou estimativa `value_per_share × quantity`. */
  total_value: number
  /** Classe do ativo no catálogo, distinta do tipo de provento (dividendo/JCP). */
  asset_type?: AssetType | null
  currency?: string
}

/** Barra do gráfico mensal de proventos. */
export interface MonthlyBar {
  /** Mês de pagamento no formato `YYYY-MM`. */
  month: string
  /** Soma dos `total_value` de todas as linhas daquele mês. */
  total: number
  /** Subtotais do mês por classe do ativo, incluindo `unknown` quando ausente. */
  byAssetType: Record<string, number>
}

/** Colunas disponíveis para ordenação da tabela de proventos. */
export type DividendSortColumn = 'ex_date' | 'total_value' | 'ticker'

export interface DividendSort {
  column: DividendSortColumn
  direction: 'asc' | 'desc'
}
