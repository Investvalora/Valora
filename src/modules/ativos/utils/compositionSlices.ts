import type { PositionRow } from '../../portfolio/types'
import type { AssetSector } from '../services/sectorService'

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

/** Setor econômico não é a classe do ativo nem o segmento de um fundo. */
export function buildSectorSlices(rows: PositionRow[], totalBRL: number, sectors: AssetSector[]): CompositionSlice[] {
  if (!Number.isFinite(totalBRL) || totalBRL <= 0) return []
  const classification = new Map(sectors.map(row => [row.ticker, row.sector]))
  const groups = new Map<string, CompositionSlice>()
  for (const row of rows) {
    const value = row.marketValueBRL
    if (value === null || !Number.isFinite(value) || value <= 0) continue
    const company = row.type === 'stock_br' || row.type === 'bdr'
    const notApplicable = row.type === 'fixed_income' || row.type === 'crypto' || row.type === 'etf_br' || row.type === 'etf_us'
    const label = notApplicable ? 'Sem setor econômico' : company ? classification.get(row.ticker) ?? 'Não classificado' : 'Não classificado'
    const group = groups.get(label)
    if (group) group.valueBRL += value
    else groups.set(label, { id: label, label, color: tickerColor(label), international: false, valueBRL: value, percent: 0, topTicker: null })
  }
  return [...groups.values()].map(group => ({ ...group, percent: group.valueBRL / totalBRL * 100 }))
    .sort((a, b) => b.valueBRL - a.valueBRL || a.label.localeCompare(b.label))
}
