/** Moeda de cotação do ativo. Espelha o CHECK de `assets.currency` (003). */
export type AssetCurrency = 'BRL' | 'USD'

/** Classe do ativo. Espelha o enum `public.asset_type` (003). */
export type AssetType = 'stock_br' | 'fii' | 'bdr' | 'stock_us' | 'reit' | 'crypto'

/** Linha do catálogo `assets`, na forma lida pelo módulo. */
export interface Asset {
  ticker: string
  name: string
  type: AssetType
  currency: AssetCurrency
}

/** Linha de `public.positions`. */
export interface Position {
  id: string
  user_id: string
  ticker: string
  quantity: number
  average_price: number
  /** DATE do Postgres, no formato `YYYY-MM-DD`. */
  acquisition_date: string
  created_at: string
  updated_at: string
}

/**
 * Posição com o ativo do catálogo embutido (join pela FK `positions.ticker`).
 * `asset` é nulo apenas em cenário degenerado — a FK garante a linha.
 */
export interface PositionWithAsset extends Position {
  asset: Asset | null
}

/** Payload de criação. `user_id` vem da sessão, nunca do formulário. */
export interface NewPosition {
  ticker: string
  quantity: number
  average_price: number
  acquisition_date: string
}
