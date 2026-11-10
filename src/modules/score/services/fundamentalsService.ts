import { supabase } from '../../../shared/services/supabaseClient'
import type { FundamentalsRow } from '../types'

/**
 * Colunas selecionadas — inclui `lpa` e `vpa` para Graham e Payout.
 */
const FUNDAMENTALS_COLUMNS =
  'ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, lpa, vpa, payout_ratio, source, updated_at, cvm_reference_date'

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
    const fetchRows = (columns: string) => supabase
      .from('fundamentals')
      .select(columns)
      .in('ticker', tickers)
      .order('ticker', { ascending: true })
      .order('reference_date', { ascending: false })

    let { data, error } = await fetchRows(FUNDAMENTALS_COLUMNS)
    // During a coordinated rollout, the UI may arrive before the optional
    // provenance column. Retry only this missing-column error, never auth/network.
    if (error && ['42703', 'PGRST204'].includes(error.code) && error.message.includes('cvm_reference_date')) {
      const compatible = await fetchRows(FUNDAMENTALS_COLUMNS.replace(', cvm_reference_date', ''))
      data = compatible.data
      error = compatible.error
    }

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
