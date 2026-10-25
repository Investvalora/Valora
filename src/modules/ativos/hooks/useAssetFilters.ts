import { useMemo } from 'react'
import { create } from 'zustand'
import type { AssetClassKey, PositionWithAsset } from '../../portfolio/types'

export interface AssetFilters { query: string; types: AssetClassKey[] }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function matchesAssetFilters(asset: { ticker: string; name?: string | null; type?: AssetClassKey | null }, filters: AssetFilters) {
  if (filters.types.length && !filters.types.includes(asset.type ?? 'unknown')) return false
  const haystack = normalize(`${asset.ticker} ${asset.name ?? ''}`)
  return normalize(filters.query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word))
}

export const useAssetFilters = create<AssetFilters & {
  isOpen: boolean
  open: () => void
  close: () => void
  apply: (filters: AssetFilters) => void
  clear: () => void
}>((set) => ({
  query: '', types: [], isOpen: false,
  open: () => set({ isOpen: true }), close: () => set({ isOpen: false }),
  apply: ({ query, types }) => set({ query: query.trim(), types: [...new Set(types)], isOpen: false }),
  clear: () => set({ query: '', types: [] }),
}))

export function useFilteredPositions(positions: PositionWithAsset[]) {
  const { query, types } = useAssetFilters()
  return useMemo(() => positions.filter((position) => matchesAssetFilters({
    ticker: position.ticker, name: position.asset?.name, type: position.asset?.type,
  }, { query, types })), [positions, query, types])
}
