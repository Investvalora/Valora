/**
 * useColumnVisibility
 *
 * Gerencia quais colunas da tabela de posições estão visíveis.
 * Estado persiste no localStorage — o usuário não perde a configuração ao
 * recarregar a página.
 *
 * Colunas obrigatórias (sempre visíveis, não aparecem no editor):
 *   ticker, nome, quantidade, preço médio, cotação, variação, opções
 *
 * Colunas opcionais (toggle pelo usuário):
 *   saldo, peso, proventos, payout, pl, pvp, dy, yieldOnCost, score, aquisição
 */

import { useCallback, useEffect, useState } from 'react'

/** Identificadores canônicos das colunas opcionais. */
export type ColumnId =
  | 'saldo'
  | 'peso'
  | 'proventos'
  | 'payout'
  | 'pl'
  | 'pvp'
  | 'dy'
  | 'yieldOnCost'
  | 'graham'
  | 'bazin'
  | 'score'
  | 'aquisicao'

/** Metadados de cada coluna opcional para o painel de edição. */
export interface ColumnMeta {
  id: ColumnId
  label: string
  /** Grupo para organizar o painel. */
  group: 'financeiro' | 'fundamentalista' | 'outros'
}

export const COLUMN_META: ColumnMeta[] = [
  { id: 'saldo',       label: 'Saldo',             group: 'financeiro'     },
  { id: 'peso',        label: '% na Carteira',      group: 'financeiro'     },
  { id: 'proventos',   label: 'Proventos (12M)',    group: 'financeiro'     },
  { id: 'payout',      label: 'Payout %',           group: 'financeiro'     },
  { id: 'yieldOnCost', label: 'Yield on Cost',      group: 'financeiro'     },
  { id: 'pl',          label: 'P/L',                group: 'fundamentalista'},
  { id: 'pvp',         label: 'P/VP',               group: 'fundamentalista'},
  { id: 'dy',          label: 'DY %',               group: 'fundamentalista'},
  { id: 'graham',      label: 'Preço Justo (Graham)',group: 'fundamentalista'},
  { id: 'bazin',       label: 'Preço-Teto Bazin',   group: 'fundamentalista'},
  { id: 'score',       label: 'Score',              group: 'fundamentalista'},
  { id: 'aquisicao',   label: 'Data de Aquisição',  group: 'outros'         },
]

/** Colunas visíveis por padrão (igual ao layout do Investidor10). */
const DEFAULT_VISIBLE: ReadonlySet<ColumnId> = new Set<ColumnId>([
  'saldo',
  'proventos',
  'payout',
  'pl',
  'pvp',
  'dy',
  'yieldOnCost',
  'graham',
  'bazin',
])

const STORAGE_KEY = 'valora:column-visibility'

function loadFromStorage(): Set<ColumnId> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const valid = COLUMN_META.map((c) => c.id)
    const ids = (parsed as string[]).filter((id): id is ColumnId =>
      valid.includes(id as ColumnId),
    )
    return new Set(ids)
  } catch {
    return null
  }
}

function saveToStorage(visible: Set<ColumnId>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]))
  } catch {
    // localStorage pode estar bloqueado em modo privado
  }
}

export interface UseColumnVisibilityResult {
  /** Conjunto de colunas visíveis atualmente. */
  visible: Set<ColumnId>
  /** Retorna `true` se a coluna está visível. */
  isVisible: (col: ColumnId) => boolean
  /** Liga/desliga uma coluna. */
  toggle: (col: ColumnId) => void
  /** Restaura o padrão. */
  reset: () => void
}

export function useColumnVisibility(): UseColumnVisibilityResult {
  const [visible, setVisible] = useState<Set<ColumnId>>(
    () => loadFromStorage() ?? new Set(DEFAULT_VISIBLE),
  )

  useEffect(() => {
    saveToStorage(visible)
  }, [visible])

  const isVisible = useCallback((col: ColumnId) => visible.has(col), [visible])

  const toggle = useCallback((col: ColumnId) => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setVisible(new Set(DEFAULT_VISIBLE))
  }, [])

  return { visible, isVisible, toggle, reset }
}
