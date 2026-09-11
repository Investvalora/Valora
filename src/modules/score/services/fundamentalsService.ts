import { supabase } from '../../../shared/services/supabaseClient'
import type { FundamentalsRow } from '../types'

/**
 * Colunas selecionadas — apenas as usadas no cálculo de score e na UI.
 * `lpa` e `vpa` não são métricas de score no MVP, então são omitidos.
 */
const FUNDAMENTALS_COLUMNS =
  'ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, updated_at'

export const fundamentalsService = {
  /**
   * Retorna o registro de fundamentals mais recente para cada ticker fornecido.
   *
   * Usa DISTINCT ON do Postgres via ordenação: ao ordenar por `ticker` e
   * `reference_date DESC`, o cliente recebe apenas a linha mais recente por
   * ticker. Isso é equivalente ao DISTINCT ON sem precisar de raw SQL.
   *
   * A tabela `fundamentals` tem RLS com policy `FOR SELECT TO authenticated USING (true)`.
   */
  async listByTickers(tickers: string[]): Promise<FundamentalsRow[]> {
    if (tickers.length === 0) return []

    // PostgREST não suporta DISTINCT ON nativamente, mas ao ordenar por ticker
    // e reference_date DESC e depois deduplicar no cliente (map por ticker) o
    // resultado é equivalente e correto. O número de linhas é pequeno (≤50×4).
    const { data, error } = await supabase
      .from('fundamentals')
      .select(FUNDAMENTALS_COLUMNS)
      .in('ticker', tickers)
      .order('ticker', { ascending: true })
      .order('reference_date', { ascending: false })

    if (error) throw error

    // Manter apenas o registro mais recente por ticker (primeiro da série
    // descendente já é o mais recente para cada ticker).
    const latestByTicker = new Map<string, FundamentalsRow>()
    for (const row of (data ?? []) as unknown as FundamentalsRow[]) {
      if (!latestByTicker.has(row.ticker)) {
        latestByTicker.set(row.ticker, row)
      }
    }

    return Array.from(latestByTicker.values())
  },
}
