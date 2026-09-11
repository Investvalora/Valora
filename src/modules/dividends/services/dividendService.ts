import { supabase } from '../../../shared/services/supabaseClient'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { DividendRaw } from '../types'
import { DIVIDENDS_LIMIT } from '../utils/dividendConstants'

/** Colunas selecionadas — mantido explícito para evitar over-fetching. */

const DIVIDEND_COLUMNS = 'ticker, type, ex_date, payment_date, value_per_share'

export const dividendService = {
  /**
   * Proventos dos tickers fornecidos no intervalo `[since, hoje]`.
   *
   * Filtros aplicados no banco:
   * - `ticker IN tickers` — só proventos da carteira do usuário
   * - `ex_date >= since` — dentro do período selecionado
   * - `ex_date <= hoje` — exclui proventos futuros
   * - `value_per_share > 0` — exclui registros zerados
   *
   * RLS de `dividends` libera SELECT apenas para `authenticated`; sem sessão
   * a resposta viria vazia.
   */
  async listDividendsByTickers(tickers: string[], since: string): Promise<DividendRaw[]> {
    if (tickers.length === 0) return []

    const today = toIsoDate(new Date())

    const { data, error } = await supabase
      .from('dividends')
      .select(DIVIDEND_COLUMNS)
      .in('ticker', tickers)
      .gte('ex_date', since)
      .lte('ex_date', today)
      .gt('value_per_share', 0)
      .order('ex_date', { ascending: false })
      .limit(DIVIDENDS_LIMIT)

    if (error) throw error
    return (data ?? []) as unknown as DividendRaw[]
  },
}
