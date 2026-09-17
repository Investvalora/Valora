import { useMemo, useState } from 'react'
import { groupRowsByClass, ASSET_CLASS_LABEL } from '../composition'
import { sortPositionRows } from '../positionRows'
import { PositionRows, SortableHeader, HEADER_CLASS } from './PositionsTable'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'
import type { ColumnId } from '../hooks/useColumnVisibility'

// ─── formatadores locais (só para o header do grupo) ─────────────────────────

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
const fmtBRL = (v: number | null) =>
  v === null || !Number.isFinite(v) ? MISSING : brlFormatter.format(v)
const fmtSignedPct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? MISSING : `${signedPctFormatter.format(v)}%`
const fmtPct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? MISSING : `${plainPctFormatter.format(v)}%`

// ─── ícone de classe ──────────────────────────────────────────────────────────

function ClassIcon({ label, color }: { label: string; color: string }) {
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

// ─── props ────────────────────────────────────────────────────────────────────

interface GroupedPositionsTableProps {
  rows: PositionRow[]
  totalBRL: number
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
  scoreByTicker?: Map<string, number | null>
  fundamentalsUpdatedAt?: Map<string, string>
  /** Colunas opcionais visíveis — vem do useColumnVisibility da CarteiraPage. */
  visibleColumns?: Set<ColumnId>
}

// ─── componente principal ─────────────────────────────────────────────────────

export function GroupedPositionsTable({
  rows,
  totalBRL,
  sort,
  onSortChange,
  scoreByTicker,
  fundamentalsUpdatedAt,
  visibleColumns,
}: GroupedPositionsTableProps) {
  const groups = useMemo(() => groupRowsByClass(rows, totalBRL), [rows, totalBRL])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Helper de visibilidade — sem Set significa "tudo visível"
  const show = (col: ColumnId) => !visibleColumns || visibleColumns.has(col)

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

  const totalCount = groups.reduce((acc, g) => acc + g.summary.count, 0)

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-white">
        Meus Ativos{' '}
        <span className="text-gray-400 font-normal">({totalCount})</span>
      </h2>

      {groups.map(({ summary, rows: groupRows }) => {
        const isCollapsed = collapsed.has(summary.key)
        const sortedGroupRows = sortPositionRows(groupRows, sort)

        return (
          <div
            key={summary.key}
            className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface"
          >
            {/* ── Header do grupo ─────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => toggleGroup(summary.key)}
              className="w-full px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-dark-bg/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={!isCollapsed}
              aria-controls={`group-body-${summary.key}`}
              aria-label={`${summary.label} — ${summary.count} ativo${summary.count !== 1 ? 's' : ''}, ${isCollapsed ? 'expandir' : 'recolher'}`}
            >
              <span className="flex items-center gap-3 flex-shrink-0">
                <ClassIcon label={summary.label} color={summary.color} />
                <span className="text-base font-semibold text-white">{summary.label}</span>
              </span>

              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">Ativos</span>
                <span className="text-sm font-medium text-white">{summary.count}</span>
              </span>

              <span className="flex flex-col items-start ml-auto sm:ml-0">
                <span className="text-xs text-gray-400">Valor total</span>
                <span className="text-sm font-medium text-white tabular-nums">
                  {fmtBRL(summary.totalValueBRL)}
                </span>
              </span>

              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">Variação</span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    summary.avgChangePercent === null ||
                    !Number.isFinite(summary.avgChangePercent)
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

              <span className="flex flex-col items-start">
                <span className="text-xs text-gray-400">% na carteira</span>
                <span className="text-sm font-medium text-white tabular-nums">
                  {fmtPct(summary.weightPercent)}
                </span>
              </span>

              <span
                className={`ml-auto flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {/* ── Tabela interna ───────────────────────────────────────────── */}
            {!isCollapsed && (
              <div
                id={`group-body-${summary.key}`}
                className="overflow-x-auto border-t border-dark-border"
              >
                <table className="w-full border-collapse">
                  <caption className="sr-only">
                    {ASSET_CLASS_LABEL[summary.key as keyof typeof ASSET_CLASS_LABEL] ??
                      summary.label}{' '}
                    — posições
                  </caption>
                  <thead className="bg-dark-bg">
                    <tr>
                      {/* Colunas fixas */}
                      <SortableHeader
                        column="ticker"
                        label="Ticker"
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                      <th className={HEADER_CLASS}>Nome</th>
                      <th className={`${HEADER_CLASS} text-right`}>Quant.</th>
                      <th className={`${HEADER_CLASS} text-right`}>Preço médio</th>
                      <th className={`${HEADER_CLASS} text-right`}>Cotação</th>

                      {/* Colunas opcionais */}
                      {show('saldo') && (
                        <th className={`${HEADER_CLASS} text-right`}>Saldo</th>
                      )}
                      {show('peso') && (
                        <SortableHeader
                          column="weight"
                          label="% Carteira"
                          sort={sort}
                          onSortChange={onSortChange}
                          align="right"
                        />
                      )}

                      {/* Variação — sempre visível */}
                      <SortableHeader
                        column="change"
                        label="Variação"
                        sort={sort}
                        onSortChange={onSortChange}
                        align="right"
                      />

                      {show('proventos') && (
                        <th className={`${HEADER_CLASS} text-right`}>Proventos (12M)</th>
                      )}
                      {show('payout') && (
                        <th className={`${HEADER_CLASS} text-right`}>Payout %</th>
                      )}
                      {show('pl') && (
                        <th className={`${HEADER_CLASS} text-right`}>P/L</th>
                      )}
                      {show('pvp') && (
                        <th className={`${HEADER_CLASS} text-right`}>P/VP</th>
                      )}
                      {show('dy') && (
                        <th className={`${HEADER_CLASS} text-right`}>DY %</th>
                      )}
                      {show('yieldOnCost') && (
                        <th className={`${HEADER_CLASS} text-right`}>Yield on Cost</th>
                      )}
                      {show('graham') && (
                        <th className={`${HEADER_CLASS} text-right`}>Preço Justo (Graham)</th>
                      )}
                      {show('bazin') && (
                        <th className={`${HEADER_CLASS} text-right`}>Preço-Teto Bazin</th>
                      )}
                      {show('score') && scoreByTicker && (
                        <SortableHeader
                          column="score"
                          label="Score"
                          sort={sort}
                          onSortChange={onSortChange}
                          align="right"
                        />
                      )}
                      {show('aquisicao') && (
                        <th className={HEADER_CLASS}>Aquisição</th>
                      )}

                      {/* Opções — sempre visível */}
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
                      visibleColumns={visibleColumns}
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
