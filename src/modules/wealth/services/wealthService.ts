import { supabase } from '../../../shared/services/supabaseClient'
import type { PositionSnapshot, PriceHistoryRow } from '../types'

/**
 * Service do módulo wealth.
 *
 * Segue o mesmo padrão de `positionService`: objeto com métodos async,
 * acesso via Supabase client, lança em erro, retorna `(data ?? []) as T`.
 * RLS de `positions` isola por `user_id = auth.uid()`.
 * RLS de `price_history` libera leitura para `authenticated`.
 */

const POSITIONS_SNAPSHOT_COLUMNS =
  'ticker, quantity, asset:assets(currency, type)'

const PRICE_HISTORY_COLUMNS = 'ticker, date, close'

/**
 * Limite de tickers por chamada ao PostgREST `.in()`.
 * Para carteiras maiores que isso, a consulta seria particionada (futuro).
 * No MVP o limite de posições é 50 (AD-11), então 50 é suficiente.
 */
const TICKER_LIMIT = 50

export const wealthService = {
  /**
   * Posições do usuário com tipo e moeda do ativo (via join).
   *
   * O tipo é necessário para identificar ativos internacionais e aplicar
   * conversão USD → BRL. O join com `assets` via FK `positions.ticker`
   * garante coerência com o catálogo.
   */
  async listPositionsSnapshot(userId: string): Promise<PositionSnapshot[]> {
    const { data, error } = await supabase
      .from('positions')
      .select(POSITIONS_SNAPSHOT_COLUMNS)
      .eq('user_id', userId)
      .gt('quantity', 0)
      .limit(TICKER_LIMIT)

    if (error) throw error

    // Normalizar o join `asset:assets(...)` que o PostgREST retorna como objeto.
    return ((data ?? []) as unknown as Array<{
      ticker: string
      quantity: number
      asset: { currency: 'BRL' | 'USD'; type: string | null } | null
    }>).map((row) => ({
      ticker: row.ticker,
      quantity: row.quantity,
      currency: (row.asset?.currency ?? 'BRL') as 'BRL' | 'USD',
      type: (row.asset?.type as PositionSnapshot['type']) ?? null,
    }))
  },

  /**
   * Histórico de preços dos tickers informados desde `since` até hoje.
   *
   * Máximo 365 pontos por ticker (AD-11 / NFR-3): a consulta traz no máximo
   * `tickers.length × 365` linhas — suficiente para o período "Tudo" com a
   * amostragem diária exigida.
   *
   * Sem cotação no período → array vazio para aquele ticker (lacuna total).
   */
  async listPriceHistory(tickers: string[], since: string): Promise<PriceHistoryRow[]> {
    if (tickers.length === 0) return []

    const { data, error } = await supabase
      .from('price_history')
      .select(PRICE_HISTORY_COLUMNS)
      .in('ticker', tickers)
      .gte('date', since)
      .order('date', { ascending: true })
      .limit(tickers.length * 365)

    if (error) throw error

    return (data ?? []) as unknown as PriceHistoryRow[]
  },
}
