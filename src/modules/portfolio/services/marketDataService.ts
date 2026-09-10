import { supabase } from '../../../shared/services/supabaseClient'

export const marketDataService = {
  /**
   * Sincroniza cotações via Edge Function
   */
  async syncMarketData() {
    const { data, error } = await supabase.functions.invoke('sync-market-data', {
      method: 'POST'
    })

    if (error) throw error
    return data
  },

  /**
   * Busca os últimos preços de todos os ativos
   */
  async getLatestQuotes() {
    const { data, error } = await supabase
      .from('price_history')
      .select(`
        ticker,
        date,
        close,
        open,
        high,
        low,
        volume,
        source,
        created_at,
        assets (
          name,
          type
        )
      `)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  },

  /**
   * Busca histórico de preços de um ativo específico
   */
  async getAssetHistory(ticker: string, days: number = 30) {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('ticker', ticker)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) throw error
    return data
  }
}
