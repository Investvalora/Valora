import { useState } from 'react'

export const ASSET_COLUMNS = [
  { id: 'ticker', label: 'Ativo', group: 'Dados básicos', locked: true },
  { id: 'quantity', label: 'Quantidade', group: 'Dados básicos', locked: true },
  { id: 'name', label: 'Nome', group: 'Dados básicos' },
  { id: 'averagePrice', label: 'Preço médio', group: 'Dados básicos' },
  { id: 'quote', label: 'Preço atual', group: 'Dados básicos' },
  { id: 'graham', label: 'Preço justo (Graham)', group: 'Dados básicos' },
  { id: 'bazin', label: 'Preço-teto (Bazin)', group: 'Dados básicos' },
  { id: 'change', label: 'Variação', group: 'Dados básicos' },
  { id: 'return', label: 'Rentabilidade de capital', group: 'Dados básicos' },
  { id: 'balance', label: 'Saldo', group: 'Dados básicos' },
  { id: 'dividends', label: 'Proventos (12M)', group: 'Dividendos' },
  { id: 'dy', label: 'DY', group: 'Dividendos' },
  { id: 'yoc', label: 'Yield on Cost (YOC)', group: 'Dividendos' },
  { id: 'payout', label: 'Payout', group: 'Dados fundamentalistas' },
  { id: 'pl', label: 'P/L', group: 'Dados fundamentalistas' },
  { id: 'pvp', label: 'P/VP', group: 'Dados fundamentalistas' },
  { id: 'roe', label: 'ROE', group: 'Dados fundamentalistas' },
  { id: 'netMargin', label: 'Margem líquida', group: 'Dados fundamentalistas' },
  { id: 'weight', label: '% na carteira', group: 'Carteira' },
  { id: 'acquisition', label: 'Data de aquisição', group: 'Carteira' },
] as const
export type AssetColumnId = typeof ASSET_COLUMNS[number]['id']
export const DEFAULT_ASSET_COLUMNS: AssetColumnId[] = ['ticker', 'name', 'quantity', 'averagePrice', 'quote', 'balance', 'weight', 'change', 'dividends', 'payout', 'pl', 'pvp', 'dy']

export function normalizeAssetColumns(value: unknown): AssetColumnId[] {
  if (!Array.isArray(value)) return [...DEFAULT_ASSET_COLUMNS]
  return ASSET_COLUMNS.filter((column) => ('locked' in column && column.locked) || value.includes(column.id)).map((column) => column.id)
}

function load(key: string) {
  try { const raw = localStorage.getItem(key); return raw ? normalizeAssetColumns(JSON.parse(raw)) : [...DEFAULT_ASSET_COLUMNS] }
  catch { return [...DEFAULT_ASSET_COLUMNS] }
}

export function useAssetColumns(userId: string) {
  const key = `valora:assets-columns:v1:${userId}`
  const [selection, setSelection] = useState(() => ({ key, columns: load(key) }))
  const columns = selection.key === key ? selection.columns : load(key)
  const save = (value: AssetColumnId[]) => {
    const next = normalizeAssetColumns(value)
    setSelection({ key, columns: next })
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Mantém a escolha na sessão se o armazenamento estiver bloqueado. */ }
  }
  return { columns, save }
}
