import type { AssetType } from '../portfolio/types'

/** Períodos de análise disponíveis na tela Patrimônio. */
export type WealthPeriod = '1M' | '3M' | '6M' | '1A' | 'Tudo'

/**
 * Um ponto na série temporal de patrimônio.
 *
 * `value === null` indica lacuna real: nenhum ticker da carteira tinha cotação
 * naquele dia. Não interpolar — a fronteira de decisão vive aqui para o
 * gráfico não ter que decidir o que fazer com null.
 */
export interface WealthPoint {
  /** Data no formato `YYYY-MM-DD`. */
  date: string
  /** Patrimônio total em BRL naquele dia, ou `null` (gap). */
  value: number | null
}

/** Snapshot de posição com tipo de ativo para conversão USD → BRL. */
export interface PositionSnapshot {
  ticker: string
  quantity: number
  /** Moeda do ativo, vinda do join com `assets`. */
  currency: 'BRL' | 'USD'
  /** Tipo do ativo, necessário para determinar exposição internacional. */
  type: AssetType | null
}

/** Linha de preço histórico, conforme retornado por `price_history`. */
export interface PriceHistoryRow {
  ticker: string
  date: string
  close: number
}
