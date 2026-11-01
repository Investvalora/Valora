import { supabase } from '../../../shared/services/supabaseClient'
import type { AssetCurrency, AssetType } from '../../portfolio/types'

export interface FavoriteAsset {
  ticker: string
  asset: { name: string; type: AssetType; currency: AssetCurrency } | null
}

export const favoritesService = {
  async list(userId: string): Promise<FavoriteAsset[]> {
    const { data, error } = await supabase.from('asset_favorites')
      .select('ticker, asset:assets(name,type,currency)').eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as FavoriteAsset[]
  },
  async set(userId: string, ticker: string, favorite: boolean) {
    const result = favorite
      ? await supabase.from('asset_favorites').insert({ user_id: userId, ticker })
      : await supabase.from('asset_favorites').delete().eq('user_id', userId).eq('ticker', ticker)
    // Another tab may already have inserted the same favorite.
    if (result.error && !(favorite && result.error.code === '23505')) throw result.error
  },
}
