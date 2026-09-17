/** Moeda de cotação do ativo. Espelha o CHECK de `assets.currency` (003). */
export type AssetCurrency = 'BRL' | 'USD'

/** Classe do ativo. Espelha o enum `public.asset_type` (003 + 014 + 021). */
export type AssetType = 'stock_br' | 'fii' | 'bdr' | 'stock_us' | 'etf_us' | 'reit' | 'crypto' | 'fixed_income' | 'etf_br'

// ─── Renda Fixa ────────────────────────────────────────────────────────────

/**
 * Tipos de título de renda fixa suportados.
 * Espelha o CHECK da coluna `type` em `fixed_income_positions` (015).
 */
export type FixedIncomeType =
  | 'tesouro_selic'
  | 'tesouro_ipca'
  | 'tesouro_pre'
  | 'cdb_cdi'
  | 'cdb_pre'
  | 'lci_cdi'
  | 'lca_cdi'
  | 'lci_pre'
  | 'lca_pre'

/**
 * Indexador base do cálculo de rendimento.
 * Espelha o CHECK da coluna `indexer` em `fixed_income_positions` (015).
 */
export type FixedIncomeIndexer = 'selic' | 'ipca' | 'cdi' | 'pre'

/** Labels em pt-BR para exibição na UI. */
export const FIXED_INCOME_TYPE_LABEL: Record<FixedIncomeType, string> = {
  tesouro_selic: 'Tesouro Selic',
  tesouro_ipca:  'Tesouro IPCA+',
  tesouro_pre:   'Tesouro Prefixado',
  cdb_cdi:       'CDB % CDI',
  cdb_pre:       'CDB Prefixado',
  lci_cdi:       'LCI % CDI',
  lca_cdi:       'LCA % CDI',
  lci_pre:       'LCI Prefixado',
  lca_pre:       'LCA Prefixado',
}

/** Label do campo de taxa por indexador. */
export const FIXED_INCOME_RATE_LABEL: Record<FixedIncomeIndexer, string> = {
  selic: 'Taxa (% a.a.)',
  cdi:   '% do CDI (ex: 110)',
  ipca:  'Spread (% a.a., ex: 6.5 para IPCA+6,5%)',
  pre:   'Taxa prefixada (% a.a.)',
}

/** Indexador inferido pelo tipo do título. */
export const FIXED_INCOME_TYPE_INDEXER: Record<FixedIncomeType, FixedIncomeIndexer> = {
  tesouro_selic: 'selic',
  tesouro_ipca:  'ipca',
  tesouro_pre:   'pre',
  cdb_cdi:       'cdi',
  cdb_pre:       'pre',
  lci_cdi:       'cdi',
  lca_cdi:       'cdi',
  lci_pre:       'pre',
  lca_pre:       'pre',
}

/** Linha de `public.fixed_income_positions`. */
export interface FixedIncomePosition {
  id: string
  user_id: string
  name: string
  type: FixedIncomeType
  indexer: FixedIncomeIndexer
  /** % do CDI, spread IPCA+, ou taxa prefixada (% a.a.) */
  rate: number
  /** Valor aplicado em BRL. */
  principal: number
  application_date: string   // YYYY-MM-DD
  maturity_date: string | null
  /** Valor atualizado calculado pela Edge Function. Null até o primeiro cálculo. */
  current_value: number | null
  last_updated_at: string | null
  active: boolean
  created_at: string
  updated_at: string
}

/** Payload de criação de posição de renda fixa. */
export interface NewFixedIncomePosition {
  name: string
  type: FixedIncomeType
  indexer: FixedIncomeIndexer
  rate: number
  principal: number
  application_date: string
  maturity_date: string | null
}

/** Linha derivada para exibição na tabela de renda fixa. */
export interface FixedIncomeRow {
  id: string
  name: string
  type: FixedIncomeType
  indexer: FixedIncomeIndexer
  rate: number
  principal: number
  application_date: string
  maturity_date: string | null
  currentValue: number | null
  gainBRL: number | null          // currentValue - principal
  gainPercent: number | null      // (currentValue / principal - 1) * 100
  lastUpdatedAt: string | null
  isStale: boolean                // last_updated_at > 1 dia
}

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

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'jcp' | 'bonus'

export interface NewTransaction {
  ticker: string
  type: TransactionType
  quantity: number
  price: number
  brokerage_fee: number
  transaction_date: string
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
export type PositionSortColumn = 'ticker' | 'weight' | 'change' | 'score'

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
  /**
   * Classe do ativo; nula quando o join do catálogo não veio.
   *
   * Moeda e classe respondem a perguntas diferentes e por isso ambas vivem na
   * linha: a conversão para BRL depende da moeda, e a composição/exposição
   * internacional dependem da classe — BDR é negociado em BRL e ainda assim é
   * exposição ao exterior.
   */
  type: AssetType | null
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
  /**
   * Pontuação de score fundamentalista calculada client-side.
   * `null`      = fundamentals indisponível para este ticker (exibe "N/A").
   * `undefined` = nenhum score está ativo na sessão (coluna oculta).
   */
  score?: number | null
}

/**
 * Chave de uma fatia da composição: as sete classes do catálogo (incluindo
 * fixed_income) mais o bucket de classe desconhecida.
 */
export type AssetClassKey = AssetType | 'unknown'

/** Uma classe de ativo com posição avaliada na carteira. */
export interface AssetClassSlice {
  type: AssetClassKey
  /** Rótulo em pt-BR, resolvido na derivação para o card não decidir texto. */
  label: string
  /** Soma dos valores de mercado da classe, em BRL. */
  valueBRL: number
  /** Fatia do total da carteira, em pontos percentuais (0–100). */
  percent: number
  /** Ticker de maior valor de mercado na classe; desempate alfabético. */
  topTicker: string
}

/**
 * Composição da carteira por classe, já em BRL.
 *
 * Só existe fatia para classe com posição avaliada — classe sem posição não
 * aparece, e carteira sem nada avaliado devolve `slices` vazio em vez de fatias
 * de 0%.
 */
export interface CompositionSummary {
  slices: AssetClassSlice[]
  /** Total avaliado sobre o qual os percentuais foram calculados, em BRL. */
  totalBRL: number
  /** (BDR + Stocks US + REITs + Cryptos) / total, em pontos percentuais. */
  internationalPercent: number
  /** Soma em BRL das classes internacionais. */
  internationalValueBRL: number
}
