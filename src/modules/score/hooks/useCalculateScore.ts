import { useMemo } from 'react'
import { applyScoreRules } from '../utils/scoreCalculation'
import type { FundamentalsRow, ScoreByTicker, ScoreRule } from '../types'

/**
 * Calcula o score de cada ativo via `useMemo` — sem `useQuery`, sem chamadas
 * ao banco. A lógica é síncrona e pura (AD-5, AD-9).
 *
 * - Regras vazias → Map vazio (seletor sem score ativo).
 * - Fundamentals vazios → Map vazio (dados ainda não carregados).
 * - Tickers sem fundamentals ficam ausentes do Map → a UI exibe "N/A".
 *
 * O resultado é estável enquanto `rules` e `fundamentals` não mudarem,
 * portanto não recalcula em todo ciclo de render da CarteiraPage.
 */
export function useCalculateScore(
  rules: ScoreRule[],
  fundamentals: FundamentalsRow[],
): ScoreByTicker {
  return useMemo(() => {
    if (rules.length === 0 || fundamentals.length === 0) return new Map()
    return applyScoreRules(rules, fundamentals)
  }, [rules, fundamentals])
}
