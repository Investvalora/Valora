/**
 * ColumnEditorPanel
 *
 * Painel dropdown que aparece ao clicar em "Editar colunas".
 * Lista as colunas opcionais agrupadas, com toggle de visibilidade.
 */

import { useEffect, useRef } from 'react'
import { COLUMN_META, type ColumnId, type UseColumnVisibilityResult } from '../hooks/useColumnVisibility'

interface ColumnEditorPanelProps {
  visibility: UseColumnVisibilityResult
  onClose: () => void
}

const GROUP_LABELS: Record<string, string> = {
  financeiro:      'Financeiro',
  fundamentalista: 'Fundamentalista',
  outros:          'Outros',
}

const GROUPS = ['financeiro', 'fundamentalista', 'outros'] as const

export function ColumnEditorPanel({ visibility, onClose }: ColumnEditorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Fecha com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Editar colunas visíveis"
      className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-dark-border bg-dark-surface shadow-2xl"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <span className="text-sm font-semibold text-white">Colunas visíveis</span>
        <button
          type="button"
          onClick={visibility.reset}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Restaurar padrão
        </button>
      </div>

      {/* Grupos */}
      <div className="px-4 py-3 space-y-4 max-h-80 overflow-y-auto">
        {GROUPS.map((group) => {
          const cols = COLUMN_META.filter((c) => c.group === group)
          return (
            <div key={group}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-1.5">
                {cols.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      role="checkbox"
                      aria-checked={visibility.isVisible(col.id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? visibility.toggle(col.id) : undefined}
                      onClick={() => visibility.toggle(col.id)}
                      className={`
                        w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center
                        transition-colors cursor-pointer
                        ${visibility.isVisible(col.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-transparent border-gray-500 group-hover:border-gray-300'
                        }
                      `}
                    >
                      {visibility.isVisible(col.id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" aria-hidden="true">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span
                      onClick={() => visibility.toggle(col.id as ColumnId)}
                      className="text-sm text-gray-300 group-hover:text-white transition-colors select-none"
                    >
                      {col.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
