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
import { indicatorValue } from '../../shared/indicators/catalog'

export interface EnrichInput {
  /** Linhas derivadas por `derivePositionRows`. */
  rows: PositionRow[]
  /** Fundamentals mais recentes por ticker. */
  fundamentalsByTicker: Map<string, FundamentalsRow>
  /** Proventos recebidos nos últimos 12M em BRL, por ticker. */
  dividendTotalsByTicker: Map<string, number | null>
  /** Recebimentos 12M convertidos na data de pagamento para a moeda do custo. */
  dividendLocalTotalsByTicker?: Map<string, number | null>
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
 * - `payoutPercent`                — distribuição/lucro da empresa, informado pela fonte
 * - `yieldOnCostPercent`           — recebimentos 12M/custo atual, na mesma moeda
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
  dividendLocalTotalsByTicker,
  bazinByTicker,
}: EnrichInput): PositionRow[] {
  return rows.map((row) => {
    const fund = fundamentalsByTicker.get(row.ticker) ?? null
    const proventosRecebidosBRL = dividendTotalsByTicker.get(row.ticker) ?? null

    // P/L, P/VP, DY — vindos diretamente do fundamentals
    const pl  = indicatorValue(fund, 'pl', row.type)
    const pvp = indicatorValue(fund, 'pvp', row.type)
    const dy  = indicatorValue(fund, 'dy', row.type)
    const lpa = fund?.lpa ?? null
    const vpa = fund?.vpa ?? null

    // Nunca inferir payout dos recebimentos pessoais, DY × P/L ou períodos distintos.
    const company = row.type && ['stock_br', 'stock_us', 'bdr'].includes(row.type)
    const ratio = fund?.payout_ratio
    const payoutPercent = company && fund?.source === 'yahoo' && lpa !== null && Number.isFinite(lpa) && lpa > 0
      && ratio != null && Number.isFinite(ratio) && ratio >= 0 ? ratio : null

    // Yield on Cost = proventos / (preço médio × quantidade) × 100
    let yieldOnCostPercent: number | null = null
    const costTotal = row.averagePrice * row.quantity
    const localIncome = dividendLocalTotalsByTicker?.has(row.ticker)
      ? dividendLocalTotalsByTicker.get(row.ticker) ?? null
      : row.currency === 'BRL' ? proventosRecebidosBRL : null
    if (localIncome !== null && costTotal > 0) {
      yieldOnCostPercent = (localIncome / costTotal) * 100
    }

    // Graham = √(22,5 × LPA × VPA)
    const grahamPrice = row.type && ['stock_br', 'stock_us', 'bdr'].includes(row.type)
      ? calcGrahamPrice(lpa, vpa)
      : null

    // Bazin ceiling — vem do cálculo pré-computado pelo useBazin
    const bazinResult = bazinByTicker?.get(row.ticker) ?? null
    const bazinCeiling = bazinResult?.ceilingPriceLocal
      ?? (row.currency === 'BRL' ? bazinResult?.ceilingPrice ?? null : null)

    return {
      ...row,
      pl,
      roe: fund?.roe ?? null,
      netMargin: fund?.net_margin ?? null,
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
