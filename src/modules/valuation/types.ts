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
