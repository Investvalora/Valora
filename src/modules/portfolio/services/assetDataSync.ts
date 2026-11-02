import { create } from 'zustand'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../../../shared/services/supabaseClient'

type Report = { ticker: string; prices: string; dividends: string; fundamentals: string }
type SyncState = { pending: string[]; warnings: Record<string, string> }
export const useAssetDataSyncState = create<SyncState>(() => ({ pending: [], warnings: {} }))

/** A saved transaction remains successful even if a public provider is offline. */
export async function syncAssetData(client: QueryClient, userId: string, ticker: string) {
  const normalized = ticker.trim().toUpperCase()
  if (useAssetDataSyncState.getState().pending.includes(normalized)) return
  useAssetDataSyncState.setState(state => ({ pending: [...state.pending, normalized] }))
  let warning: string | undefined
  try {
    const report = await client.fetchQuery({
      queryKey: ['asset-data-sync', userId, normalized], staleTime: 15 * 60 * 1000,
      retry: false,
      queryFn: async () => {
        const { data, error } = await supabase.functions.invoke<Report>('sync-asset-data', { body: { ticker: normalized } })
        if (error || !data) throw new Error('sync_unavailable')
        return data
      },
    })
    const unavailable = [report.prices, report.dividends, report.fundamentals].includes('unavailable')
    if (unavailable) {
      warning = 'Parte dos dados não está disponível na fonte gratuita. Os dados existentes foram mantidos.'
      client.removeQueries({ queryKey: ['asset-data-sync', userId, normalized], exact: true })
    }
  } catch {
    warning = 'Não foi possível atualizar os dados agora. Seu lançamento foi salvo.'
  } finally {
    const keys = [['portfolio', 'quotes'], ['wealth'], ['score', 'fundamentals'], ['dividends'], ['assets', 'dividends'], ['portfolio', 'dividend-totals'], ['valuation'], ['performance']]
    await Promise.all(keys.map(queryKey => client.invalidateQueries({ queryKey })))
    useAssetDataSyncState.setState(state => {
      const warnings = { ...state.warnings }
      if (warning) warnings[normalized] = warning
      else delete warnings[normalized]
      return { pending: state.pending.filter(value => value !== normalized), warnings }
    })
  }
}
