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

/**
 * Último fechamento conhecido de um ticker, lido de `price_history`.
 *
 * `date` e `updated_at` respondem a perguntas diferentes e por isso ambos são
 * carregados: `date` é o dia do fechamento (é ele que decide se a cotação está
 * antiga) e `updated_at` é quando a linha foi gravada. Numa ingestão de sábado
 * `updated_at` é de hoje e o `close` é de sexta.
 */
export interface LatestQuote {
  ticker: string
  /** Fechamento na moeda do ativo. NUMERIC pode chegar como string. */
  close: number
  /** Procedência da linha (`b3_cotahist`, `brapi`, `synthetic`, ...). */
  source: string
  /** DATE do fechamento, `YYYY-MM-DD`. */
  date: string
  /** TIMESTAMPTZ da gravação da linha. */
  updated_at: string
}

/** Coluna pela qual a lista pode ser ordenada. */
export type PositionSortColumn = 'ticker' | 'weight' | 'change'

export type SortDirection = 'asc' | 'desc'

export interface PositionSort {
  column: PositionSortColumn
  direction: SortDirection
}

/**
 * Linha da tabela com tudo já derivado pelo pai.
 *
 * Números vêm coeridos (`NaN` quando o banco devolveu algo ilegível) e as
 * métricas em BRL vêm `null` quando não puderam ser calculadas — nunca `0`:
 * zero é uma afirmação sobre o patrimônio, ausência é uma lacuna.
 */
export interface PositionRow {
  id: string
  ticker: string
  name: string | null
  /** Moeda do ativo; nula quando o join do catálogo não veio. */
  currency: AssetCurrency | null
  quantity: number
  averagePrice: number
  /** DATE `YYYY-MM-DD`, exibida como veio quando não casa o formato. */
  acquisitionDate: string
  /** Procedência da cotação, para o tooltip. Nula quando não há cotação. */
  quote: LatestQuote | null
  /** Fechamento na moeda do ativo. `NaN` sem cotação utilizável. */
  quotePrice: number
  /** Valor de mercado em BRL. */
  marketValueBRL: number | null
  /** Peso relativo em % do total da carteira em BRL. */
  weightPercent: number | null
  /** Variação % da cotação sobre o preço médio, na moeda do ativo. */
  changePercent: number | null
  /** Fechamento com mais de um dia — sinaliza "cotação antiga". */
  isStaleQuote: boolean
  /** O valor de mercado desta linha passou pela conversão USD. */
  usesUSDRate: boolean
}
