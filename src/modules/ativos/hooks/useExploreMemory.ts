import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Asset } from '../../portfolio/types'

export type RecentAsset = Pick<Asset, 'ticker' | 'name' | 'type' | 'currency'>

type ExploreEntry = {
  lastRoute: string
  recentAssets: RecentAsset[]
}

const EMPTY_ENTRY: ExploreEntry = { lastRoute: '/ativos/explorar', recentAssets: [] }
const RECENT_LIMIT = 6

type ExploreMemoryStore = {
  entries: Record<string, ExploreEntry>
  rememberRoute: (userId: string, route: string) => void
  rememberAsset: (userId: string, asset: RecentAsset) => void
}

export const useExploreMemory = create<ExploreMemoryStore>()(persist((set) => ({
  entries: {},
  rememberRoute: (userId, route) => {
    if (!route.startsWith('/ativos/explorar')) return
    set((state) => {
      const current = state.entries[userId] ?? EMPTY_ENTRY
      if (current.lastRoute === route) return state
      return { entries: { ...state.entries, [userId]: { ...current, lastRoute: route } } }
    })
  },
  rememberAsset: (userId, asset) => set((state) => {
    const current = state.entries[userId] ?? EMPTY_ENTRY
    const recentAssets = [asset, ...current.recentAssets.filter((item) => item.ticker !== asset.ticker)].slice(0, RECENT_LIMIT)
    if (current.recentAssets[0]?.ticker === asset.ticker &&
      current.recentAssets[0]?.name === asset.name &&
      current.recentAssets[0]?.type === asset.type &&
      current.recentAssets[0]?.currency === asset.currency) return state
    return { entries: { ...state.entries, [userId]: { ...current, recentAssets } } }
  }),
}), {
  name: 'valora:explore-memory:v1',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ entries: state.entries }),
}))

export function selectExploreEntry(entries: Record<string, ExploreEntry>, userId: string): ExploreEntry {
  return entries[userId] ?? EMPTY_ENTRY
}
