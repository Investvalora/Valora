import type { PositionRow } from '../../portfolio/types'

export interface CompositionSlice {
  id: string
  label: string
  color: string
  international: boolean
  valueBRL: number
  percent: number
  topTicker: string | null
}

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#fb923c', '#e879f9', '#a3e635', '#818cf8']

function tickerColor(ticker: string) {
  let hash = 0
  for (const char of ticker) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length]
}

export function buildAssetSlices(rows: PositionRow[], totalBRL: number): CompositionSlice[] {
  if (!Number.isFinite(totalBRL) || totalBRL <= 0) return []
  const assets = new Map<string, CompositionSlice>()
  for (const row of rows) {
    const value = row.marketValueBRL
    if (value === null || !Number.isFinite(value) || value <= 0) continue
    const existing = assets.get(row.ticker)
    if (existing) existing.valueBRL += value
    else assets.set(row.ticker, {
      id: row.ticker, label: row.ticker, color: tickerColor(row.ticker),
      international: row.currency === 'USD', valueBRL: value, percent: 0, topTicker: row.name,
    })
  }
  return [...assets.values()]
    .map((asset) => ({ ...asset, percent: (asset.valueBRL / totalBRL) * 100 }))
    .sort((a, b) => b.valueBRL - a.valueBRL || a.label.localeCompare(b.label))
}
