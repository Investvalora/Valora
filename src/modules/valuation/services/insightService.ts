import { supabase } from '../../../shared/services/supabaseClient'
import type {
  CreateBazinInsightPayload,
  CreateGrahamInsightPayload,
  InsightRecord,
  YahooDividendsResponse,
} from '../types'

const INSIGHT_COLUMNS =
  'id, user_id, ticker, strategy, currency, min_dy, annual_dividend, ceiling_price, graham_price, current_price, margin, lpa, vpa, notes, created_at, updated_at'

export const insightService = {
  /** Lista todos os insights do usuário, do mais recente ao mais antigo. */
  async listInsights(userId: string): Promise<InsightRecord[]> {
    const { data, error } = await supabase
      .from('insights')
      .select(INSIGHT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as InsightRecord[]
  },

  /** Salva um insight Bazin calculado on-demand. */
  async createBazinInsight(
    userId: string,
    payload: CreateBazinInsightPayload,
  ): Promise<InsightRecord> {
    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id: userId,
        strategy: 'bazin',
        ticker: payload.ticker,
        currency: payload.currency,
        min_dy: payload.min_dy,
        annual_dividend: payload.annual_dividend,
        ceiling_price: payload.ceiling_price,
        current_price: payload.current_price,
        margin: payload.margin,
      })
      .select(INSIGHT_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as InsightRecord
  },

  /** Salva um insight Graham calculado on-demand. */
  async createGrahamInsight(
    userId: string,
    payload: CreateGrahamInsightPayload,
  ): Promise<InsightRecord> {
    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id: userId,
        strategy: 'graham',
        ticker: payload.ticker,
        currency: payload.currency,
        graham_price: payload.graham_price,
        current_price: payload.current_price,
        margin: payload.margin,
        lpa: payload.lpa,
        vpa: payload.vpa,
      })
      .select(INSIGHT_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as InsightRecord
  },

  /** Remove um insight pelo id. RLS garante que só o dono pode excluir. */
  async deleteInsight(userId: string, insightId: string): Promise<void> {
    const { error } = await supabase
      .from('insights')
      .delete()
      .eq('id', insightId)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Busca dividendos históricos de 12 meses via Yahoo Finance (Edge Function).
   * Retorna on-demand sem persistir no banco.
   */
  async fetchYahooDividends(
    ticker: string,
    currency: string,
  ): Promise<YahooDividendsResponse> {
    const { data, error } = await supabase.functions.invoke('fetch-dividends-yahoo', {
      body: { ticker, currency },
    })
    if (error) throw error
    const result = data as YahooDividendsResponse & { error?: string }
    if (result.error) throw new Error(result.error)
    return result
  },
}
