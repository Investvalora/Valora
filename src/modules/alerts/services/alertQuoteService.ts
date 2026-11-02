import { positionService } from '../../portfolio/services/positionService'
import { supabase } from '../../../shared/services/supabaseClient'

export const alertQuoteService = {
  resolveAsset: (ticker: string) => positionService.findAssetByTicker(ticker),
  async getQuote(ticker: string): Promise<{ price: number; date?: string } | null> {
    const rows = await positionService.listLatestQuotes([ticker])
    const row = rows.find(item => item.ticker === ticker)
    if (row && Number.isFinite(Number(row.close)) && Number(row.close) > 0) {
      return { price: Number(row.close), date: row.date ?? undefined }
    }
    // Called only after an explicit selection of a known catalogue asset.
    const { data, error } = await supabase.functions.invoke('lookup-asset', { body: { ticker } })
    if (error) throw error
    return typeof data?.latestPrice === 'number' && Number.isFinite(data.latestPrice) && data.latestPrice > 0
      ? { price: data.latestPrice } : null
  },
}
