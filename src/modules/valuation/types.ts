/** Resultado do cálculo Bazin para um ticker. */
export interface BazinResult {
  ticker: string
  /** Soma dos `value_per_share` dos últimos 12 meses. Zero quando sem registros. */
  annualDividend: number
  /**
   * Preço-teto calculado: `annualDividend / minDY`.
   * `null` quando `annualDividend <= 0` ou `minDY <= 0` ou valores não finitos.
   */
  ceilingPrice: number | null
  /**
   * Preço de fechamento mais recente da `price_history`.
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
