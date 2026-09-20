import type { AssetCurrency } from '../portfolio/types'

/** Resultado do cálculo Bazin para um ticker. */
export interface BazinResult {
  ticker: string
  /** Moeda do ativo — 'BRL' ou 'USD'. Todos os valores monetários já estão em BRL. */
  currency: AssetCurrency
  /** Soma dos `value_per_share` dos últimos 12 meses **em BRL** (ativos USD já convertidos). */
  annualDividend: number
  /**
   * Preço-teto calculado em BRL: `annualDividend / minDY`.
   * `null` quando `annualDividend <= 0` ou `minDY <= 0` ou valores não finitos.
   */
  ceilingPrice: number | null
  /**
   * Preço de fechamento mais recente **em BRL** (ativos USD já convertidos).
   * `null` quando sem cotação disponível.
   */
  currentPrice: number | null
  /**
   * Margem de segurança: `((ceilingPrice − currentPrice) / currentPrice) × 100`.
   * Positiva = cotação abaixo do teto (oportunidade).
   * Negativa = cotação acima do teto (sobrevalorizado).
   * `null` quando `ceilingPrice` ou `currentPrice` são nulos.
   */
  margin: number | null
  /** `true` quando há pelo menos um dividendo nos últimos 12 meses. */
  hasData: boolean
}

/** Map de ticker → resultado Bazin. */
export type BazinByTicker = Map<string, BazinResult>

/** Resultado do cálculo Graham para um ticker. */
export interface GrahamResult {
  ticker: string
  /** Moeda do ativo — 'BRL' ou 'USD'. Valores monetários já estão em BRL. */
  currency: AssetCurrency
  /**
   * Preço justo Graham em BRL: √(22,5 × LPA × VPA).
   * `null` quando LPA ou VPA ausentes / ≤ 0.
   */
  grahamPrice: number | null
  /**
   * Preço de fechamento mais recente em BRL (ativos USD já convertidos).
   * `null` quando sem cotação disponível.
   */
  currentPrice: number | null
  /**
   * Margem de segurança: `((grahamPrice − currentPrice) / currentPrice) × 100`.
   * Positiva = cotação abaixo do justo (oportunidade).
   * Negativa = cotação acima do justo (sobrevalorizado).
   * `null` quando `grahamPrice` ou `currentPrice` são nulos.
   */
  margin: number | null
  /** LPA utilizado no cálculo (na moeda do ativo, sem conversão — Graham é relativo). */
  lpa: number | null
  /** VPA utilizado no cálculo (na moeda do ativo, sem conversão — Graham é relativo). */
  vpa: number | null
  /** `true` quando há LPA e VPA disponíveis para o cálculo. */
  hasData: boolean
}

/** Map de ticker → resultado Graham. */
export type GrahamByTicker = Map<string, GrahamResult>

// ─── Insights ─────────────────────────────────────────────────────────────────

export type InsightStrategy = 'bazin' | 'graham'

/**
 * Registro de insight salvo pelo usuário.
 * Espelha a tabela `public.insights`.
 */
export interface InsightRecord {
  id: string
  user_id: string
  ticker: string
  strategy: InsightStrategy
  currency: AssetCurrency
  /** DY mínimo usado no cálculo Bazin (decimal, ex: 0.06). Null para Graham. */
  min_dy: number | null
  /** Dividendo anual em BRL — Bazin. */
  annual_dividend: number | null
  /** Preço-teto Bazin em BRL. */
  ceiling_price: number | null
  /** Preço justo Graham em BRL. */
  graham_price: number | null
  /** Cotação em BRL no momento do cálculo. */
  current_price: number | null
  /** Margem de segurança (%). */
  margin: number | null
  /** LPA — Graham. */
  lpa: number | null
  /** VPA — Graham. */
  vpa: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Payload para criar um insight Bazin. */
export interface CreateBazinInsightPayload {
  ticker: string
  currency: AssetCurrency
  min_dy: number
  annual_dividend: number
  ceiling_price: number | null
  current_price: number | null
  margin: number | null
}

/** Payload para criar um insight Graham. */
export interface CreateGrahamInsightPayload {
  ticker: string
  currency: AssetCurrency
  graham_price: number | null
  current_price: number | null
  margin: number | null
  lpa: number | null
  vpa: number | null
}

/** Resposta da Edge Function fetch-dividends-yahoo. */
export interface YahooDividendsResponse {
  ticker: string
  symbol: string
  annualDividend: number
  payments: Array<{ date: string; amount: number }>
  source: 'yahoo'
}
