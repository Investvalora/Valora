/**
 * enrichPositionRows
 *
 * Segundo passo de derivação: recebe as linhas já calculadas por
 * `derivePositionRows` e adiciona os campos opcionais que dependem de
 * fontes externas (fundamentals + dividendos + Bazin).
 *
 * Mantido separado de `derivePositionRows` para não forçar CarteiraPage a
 * sempre carregar todas as fontes — as novas colunas são opcionais.
 */

import type { PositionRow } from './types'
import type { FundamentalsRow } from '../score/types'
import type { BazinByTicker } from '../valuation/types'
import { calcGrahamPrice } from '../valuation/utils/grahamCalculation'

export interface EnrichInput {
  /** Linhas derivadas por `derivePositionRows`. */
  rows: PositionRow[]
  /** Fundamentals mais recentes por ticker. */
  fundamentalsByTicker: Map<string, FundamentalsRow>
  /** Proventos recebidos nos últimos 12M em BRL, por ticker. */
  dividendTotalsByTicker: Map<string, number>
  /**
   * Resultados Bazin por ticker (de `useBazin`).
   * Quando ausente, `bazinCeiling` fica `null`.
   */
  bazinByTicker?: BazinByTicker
}

/**
 * Enriquece cada `PositionRow` com:
 * - `pl`, `pvp`, `dy`              — direto do `FundamentalsRow`
 * - `proventosRecebidosBRL`        — do `dividendTotalsByTicker`
 * - `payoutPercent`                — (dividendos_por_ação / lpa) × 100
 * - `yieldOnCostPercent`           — (proventosRecebidosBRL / custo_total) × 100
 * - `grahamPrice`                  — √(22,5 × lpa × vpa)
 * - `bazinCeiling`                 — dividendo_anual / DY_mínimo (de `bazinByTicker`)
 *
 * Campos ficam `null` quando os dados necessários estão ausentes.
 * A função é pura — não muta as linhas originais.
 */
export function enrichPositionRows({
  rows,
  fundamentalsByTicker,
  dividendTotalsByTicker,
  bazinByTicker,
}: EnrichInput): PositionRow[] {
  return rows.map((row) => {
    const fund = fundamentalsByTicker.get(row.ticker) ?? null
    const proventosRecebidosBRL = dividendTotalsByTicker.get(row.ticker) ?? null

    // P/L, P/VP, DY — vindos diretamente do fundamentals
    const pl  = fund?.pl  ?? null
    const pvp = fund?.pvp ?? null
    const dy  = fund?.dy  ?? null
    const lpa = fund?.lpa ?? null
    const vpa = fund?.vpa ?? null

    // Payout = (dividendos_por_ação / lpa) × 100
    let payoutPercent: number | null = null
    if (proventosRecebidosBRL !== null && row.quantity > 0 && lpa !== null && lpa > 0) {
      const divPerShare = proventosRecebidosBRL / row.quantity
      payoutPercent = (divPerShare / lpa) * 100
    }

    // Yield on Cost = proventos / (preço médio × quantidade) × 100
    let yieldOnCostPercent: number | null = null
    const costTotal = row.averagePrice * row.quantity
    if (proventosRecebidosBRL !== null && costTotal > 0) {
      yieldOnCostPercent = (proventosRecebidosBRL / costTotal) * 100
    }

    // Graham = √(22,5 × LPA × VPA)
    const grahamPrice = calcGrahamPrice(lpa, vpa)

    // Bazin ceiling — vem do cálculo pré-computado pelo useBazin
    const bazinResult = bazinByTicker?.get(row.ticker) ?? null
    const bazinCeiling = bazinResult?.ceilingPrice ?? null

    return {
      ...row,
      pl,
      pvp,
      dy,
      proventosRecebidosBRL,
      payoutPercent,
      yieldOnCostPercent,
      grahamPrice,
      bazinCeiling,
    }
  })
}
