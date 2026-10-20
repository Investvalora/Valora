import { supabase } from '../../../shared/services/supabaseClient'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { DividendRaw } from '../types'
import { DIVIDENDS_LIMIT } from '../utils/dividendConstants'

/** Colunas selecionadas — mantido explícito para evitar over-fetching. */

const DIVIDEND_COLUMNS = 'ticker, type, ex_date, payment_date, value_per_share'

export const dividendService = {
  /**
   * Sincroniza dividendos reais via Yahoo Finance para os tickers fornecidos
   * (ou para todos os tickers da carteira se nenhum for informado).
   * Os dados são persistidos na tabela `dividends` com source='yahoo',
   * sobrescrevendo os dados sintéticos do seed.
   */
  async syncFromYahoo(tickers?: string[]): Promise<{ synced: number; inserted: number; tickers_processed: string[] }> {
    const { data, error } = await supabase.functions.invoke('sync-dividends-yahoo', {
      body: tickers && tickers.length > 0 ? { tickers } : {},
    })
    if (error) throw error
    return data as { synced: number; inserted: number; tickers_processed: string[] }
  },

  /**
  * Proventos pagos dos tickers fornecidos no intervalo `[since, hoje]`.
   *
   * Filtros aplicados no banco:
   * - `ticker IN tickers` — só proventos da carteira do usuário
  * - `payment_date` dentro do período selecionado; `ex_date` é fallback quando nula
  * - exclui pagamentos futuros (e datas COM futuras no fallback)
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
      .or(`and(payment_date.gte.${since},payment_date.lte.${today}),and(payment_date.is.null,ex_date.gte.${since},ex_date.lte.${today})`)
      .gt('value_per_share', 0)
      .order('payment_date', { ascending: false, nullsFirst: false })
      .limit(DIVIDENDS_LIMIT)

    if (error) throw error
    return (data ?? []) as unknown as DividendRaw[]
  },
}
