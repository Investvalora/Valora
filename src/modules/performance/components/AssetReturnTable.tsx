import { useState } from 'react'
import type { AssetReturnRow, AssetReturnSort, AssetReturnSortColumn } from '../types'
import { downloadAssetReturnCsv } from '../export/assetReturnCsv'

interface AssetReturnTableProps {
  rows: AssetReturnRow[]
}

const DEFAULT_SORT: AssetReturnSort = { column: 'totalReturnPct', direction: 'desc' }

const pctFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${pctFormatter.format(value)}%`
}

function formatBRL(value: number): string {
  return brlFormatter.format(value).replace(/\u00a0/g, ' ')
}

function pctColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'text-gray-500'
  return value >= 0 ? 'text-green-400' : 'text-red-400'
}

function sortRows(rows: AssetReturnRow[], sort: AssetReturnSort): AssetReturnRow[] {
  return [...rows].sort((a, b) => {
    const { column, direction } = sort
    const mul = direction === 'asc' ? 1 : -1

    if (column === 'ticker') {
      return mul * a.ticker.localeCompare(b.ticker)
    }

    const aVal = a[column]
    const bVal = b[column]

    // nulls sempre ao final, independente da direção
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    return mul * ((aVal as number) - (bVal as number))
  })
}

interface SortHeaderProps {
  label: string
  column: AssetReturnSortColumn
  sort: AssetReturnSort
  onSort: (column: AssetReturnSortColumn) => void
  className?: string
}

function SortHeader({ label, column, sort, onSort, className = '' }: SortHeaderProps) {
  const isActive = sort.column === column
  const icon = isActive ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-200 whitespace-nowrap ${className}`}
      onClick={() => onSort(column)}
      aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span aria-hidden="true" className="ml-1 text-gray-500">{icon}</span>
    </th>
  )
}

/**
 * Tabela de rentabilidade por ativo (Story 4.2).
 * Exibe ganho de capital, proventos e retorno total por posição.
 * Colunas ordenáveis; botão de exportar CSV.
 */
export function AssetReturnTable({ rows }: AssetReturnTableProps) {
  const [sort, setSort] = useState<AssetReturnSort>(DEFAULT_SORT)

  if (rows.length === 0) return null

  function handleSort(column: AssetReturnSortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'desc' },
    )
  }

  const sorted = sortRows(rows, sort)

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface overflow-hidden">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
        <h2 className="text-sm font-semibold text-gray-300">Rentabilidade por Ativo</h2>
        <button
          type="button"
          onClick={() => downloadAssetReturnCsv(rows)}
          className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-dark-surface hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Exportar tabela de rentabilidade por ativo como CSV"
        >
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border text-left">
              <SortHeader label="Ticker" column="ticker" sort={sort} onSort={handleSort} className="pl-6" />
              <SortHeader label="Retorno Total" column="totalReturnPct" sort={sort} onSort={handleSort} className="text-right" />
              <SortHeader label="Ganho de Capital" column="capitalGainPct" sort={sort} onSort={handleSort} className="text-right" />
              <SortHeader label="Proventos (R$)" column="dividendsReceived" sort={sort} onSort={handleSort} className="text-right" />
              <SortHeader label="Proventos %" column="dividendsPct" sort={sort} onSort={handleSort} className="text-right pr-6" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.ticker}
                className="border-b border-dark-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 pl-6">
                  <span className="font-semibold text-white">{row.ticker}</span>
                  {row.name && (
                    <span className="block text-xs text-gray-500 mt-0.5 truncate max-w-[140px]">
                      {row.name}
                    </span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${pctColor(row.totalReturnPct)}`}>
                  {formatPct(row.totalReturnPct)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${pctColor(row.capitalGainPct)}`}>
                  {formatPct(row.capitalGainPct)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                  {formatBRL(row.dividendsReceived)}
                </td>
                <td className={`px-4 py-3 pr-6 text-right tabular-nums ${pctColor(row.dividendsPct)}`}>
                  {formatPct(row.dividendsPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
