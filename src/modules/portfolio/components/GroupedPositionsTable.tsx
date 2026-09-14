import { useMemo, useState } from 'react'
import {
  groupRowsByClass,
  ASSET_CLASS_LABEL,
} from '../composition'
import {
  sortPositionRows,
} from '../positionRows'
import { PositionRows } from './PositionsTable'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const signedPctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const plainPctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const MISSING = '—'

function fmtBRL(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return MISSING
  return brlFormatter.format(v)
}

function fmtSignedPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return MISSING
  return `${signedPctFormatter.format(v)}%`
}

function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return MISSING
  return `${plainPctFormatter.format(v)}%`
}

// ─── ícones de classe ─────────────────────────────────────────────────────────

/** Ícone SVG simples por classe — letra inicial sobre fundo colorido. */
function ClassIcon({ label, color }: { label: string; color: string }) {
  // Pega a primeira letra do label para o símbolo (ex: "A" de Ações BR)
  const letter = label.charAt(0).toUpperCase()
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold text-dark-bg"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

// ─── header de coluna da tabela interna ──────────────────────────────────────

const HEADER_CLASS =
  'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'

function ariaSort(sort: PositionSort, column: PositionSortColumn) {
  if (sort.column !== column) return 'none' as const
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const)
}

function SortableColHeader({
  column,
  label,
  sort,
  onSortChange,
  align = 'left',
}: {
  column: PositionSortColumn
  label: string
  sort: PositionSort
  onSortChange: (c: PositionSortColumn) => void
  align?: 'left' | 'right'
}) {
  const isActive = sort.column === column
  const alignClass = align === 'right' ? 'text-right' : 'text-left'

  return (
    <th scope="col" aria-sort={ariaSort(sort, column)} className={`${HEADER_CLASS} ${alignClass}`}>
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isActive ? 'text-white' : 'text-gray-500'
        }`}
      >
        {label}
        <span aria-hidden="true">{isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )
}

// ─── props ────────────────────────────────────────────────────────────────────

interface GroupedPositionsTableProps {
  rows: PositionRow[]
  totalBRL: number
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
  scoreByTicker?: Map<string, number | null>
  fundamentalsUpdatedAt?: Map<string, string>
}

// ─── componente principal ─────────────────────────────────────────────────────

export function GroupedPositionsTable({
  rows,
  totalBRL,
  sort,
  onSortChange,
  scoreByTicker,
  fundamentalsUpdatedAt,
}: GroupedPositionsTableProps) {
  const groups = useMemo(() => groupRowsByClass(rows, totalBRL), [rows, totalBRL])

  // Todos os grupos começam expandidos
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-dark-border p-10 text-center">
        <p className="font-medium text-gray-300">Nenhuma posição cadastrada</p>
        <p className="mt-1 text-sm text-gray-400">
          Use "+ adicionar posição" para registrar o primeiro ativo da sua carteira.
        </p>
      </div>
    )
  }

  // Total de ativos para o título da seção
  const totalCount = groups.reduce((acc, g) => acc + g.summary.count, 0)

  return (
    <div className="space-y-3">
      {/* Título da seção */}
      <h2 className="text-base font-semibold text-white">
        Meus Ativos{' '}
        <span className="text-gray-400 font-normal">({totalCount})</span>
      </h2>

      {groups.map(({ summary, rows: groupRows }) => {
        const isCollapsed = collapsed.has(summary.key)
        const sortedGroupRows = sortPositionRows(groupRows, sort)
        const hasScoreCol = !!scoreByTicker

        return (
          <div
            key={summary.key}
            className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface"
          >
            {/* ── Header do grupo ──────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => toggle(summary.key)}
              className="w-full px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-dark-bg/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={!isCollapsed}
              aria-controls={`group-body-${summary.key}`}
              aria-label={`${summary.label} — ${summary.count} ativo${summary.count !== 1 ? 's' : ''}, ${isCollapsed ? 'expandir' : 'recolher'}`}
            >
              {/* Ícone + label */}
              <span className="flex items-center gap-3 flex-shrink-0">
                <ClassIcon label={summary.label} color={summary.color} />
                <span className="text-base font-semibold text-white">
                  {summary.label}
                </span>
              </span>

              {/* Contagem */}
              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">Ativos</span>
                <span className="text-sm font-medium text-white">{summary.count}</span>
              </span>

              {/* Valor total */}
              <span className="flex flex-col items-start ml-auto sm:ml-0">
                <span className="text-xs text-gray-400">Valor total</span>
                <span className="text-sm font-medium text-white tabular-nums">
                  {fmtBRL(summary.totalValueBRL)}
                </span>
              </span>

              {/* Variação média */}
              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">Variação</span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    summary.avgChangePercent === null || !Number.isFinite(summary.avgChangePercent)
                      ? 'text-gray-400'
                      : summary.avgChangePercent > 0
                        ? 'text-green-400'
                        : summary.avgChangePercent < 0
                          ? 'text-red-400'
                          : 'text-gray-200'
                  }`}
                >
                  {fmtSignedPct(summary.avgChangePercent)}
                </span>
              </span>

              {/* % na carteira */}
              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">% na carteira</span>
                <span className="text-sm font-medium text-white tabular-nums">
                  {fmtPct(summary.weightPercent)}
                </span>
              </span>

              {/* Chevron */}
              <span
                className={`ml-auto flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {/* ── Tabela interna ────────────────────────────────────────────── */}
            {!isCollapsed && (
              <div
                id={`group-body-${summary.key}`}
                className="overflow-x-auto border-t border-dark-border"
              >
                <table className="w-full border-collapse">
                  <caption className="sr-only">
                    {ASSET_CLASS_LABEL[summary.key as keyof typeof ASSET_CLASS_LABEL] ?? summary.label} — posições
                  </caption>
                  <thead className="bg-dark-bg">
                    <tr>
                      <SortableColHeader
                        column="ticker"
                        label="Ticker"
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                      <th className={HEADER_CLASS}>Nome</th>
                      <th className={`${HEADER_CLASS} text-right`}>Quant.</th>
                      <th className={`${HEADER_CLASS} text-right`}>Preço médio</th>
                      <th className={`${HEADER_CLASS} text-right`}>Cotação</th>
                      <th className={`${HEADER_CLASS} text-right`}>Valor mercado</th>
                      <SortableColHeader
                        column="weight"
                        label="Peso"
                        sort={sort}
                        onSortChange={onSortChange}
                        align="right"
                      />
                      <SortableColHeader
                        column="change"
                        label="Variação"
                        sort={sort}
                        onSortChange={onSortChange}
                        align="right"
                      />
                      {hasScoreCol && (
                        <SortableColHeader
                          column="score"
                          label="Score"
                          sort={sort}
                          onSortChange={onSortChange}
                          align="right"
                        />
                      )}
                      <th className={HEADER_CLASS}>Aquisição</th>
                      <th className={`${HEADER_CLASS} text-right`}>Opções</th>
                    </tr>
                  </thead>
                  <tbody>
                    <PositionRows
                      rows={sortedGroupRows}
                      sort={sort}
                      onSortChange={onSortChange}
                      scoreByTicker={scoreByTicker}
                      fundamentalsUpdatedAt={fundamentalsUpdatedAt}
                      showActions={true}
                    />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
