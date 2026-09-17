/**
 * Cálculo do Preço Justo pelo método Graham.
 *
 * Fórmula clássica (Benjamin Graham — "O Investidor Inteligente"):
 *   Preço Justo = √(22,5 × LPA × VPA)
 *
 * Onde:
 *   - LPA = Lucro Por Ação (últimos 12 meses)
 *   - VPA = Valor Patrimonial Por Ação
 *   - 22,5 = 15 (P/L máximo) × 1,5 (P/VP máximo)
 *
 * Retorna `null` quando:
 *   - LPA ou VPA ausentes / não finitos
 *   - LPA ou VPA ≤ 0 (empresa com prejuízo ou patrimônio negativo — raiz imaginária)
 *   - Resultado não finito (proteção contra overflow)
 */
export function calcGrahamPrice(
  lpa: number | null | undefined,
  vpa: number | null | undefined,
): number | null {
  if (lpa === null || lpa === undefined || !Number.isFinite(lpa) || lpa <= 0) return null
  if (vpa === null || vpa === undefined || !Number.isFinite(vpa) || vpa <= 0) return null

  const result = Math.sqrt(22.5 * lpa * vpa)
  return Number.isFinite(result) ? result : null
}

/**
 * Margem de segurança Graham: ((preçoJusto − cotação) / cotação) × 100.
 * Positiva = cotação abaixo do justo (oportunidade).
 * Negativa = cotação acima do justo (sobrevalorizado).
 * `null` quando qualquer entrada é inválida.
 */
export function calcGrahamMargin(
  grahamPrice: number | null,
  currentPrice: number | null,
): number | null {
  if (grahamPrice === null || currentPrice === null) return null
  if (!Number.isFinite(grahamPrice) || !Number.isFinite(currentPrice)) return null
  if (currentPrice <= 0) return null
  return ((grahamPrice - currentPrice) / currentPrice) * 100
}
