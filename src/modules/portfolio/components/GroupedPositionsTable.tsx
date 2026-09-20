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

// ─── FixedIncomeGroup ─────────────────────────────────────────────────────────
// Grupo colapsável de Renda Fixa — mesmo visual dos outros grupos da carteira,
// mas inicia **minimizado** por padrão.

import { Tooltip } from '../../../shared/components/Tooltip'
import type { FixedIncomeRow } from '../types'
import { FIXED_INCOME_TYPE_LABEL } from '../types'

const FI_COLOR = '#10b981'  // emerald-500 — mesma cor do botão "+ renda fixa"

interface FixedIncomeGroupProps {
  rows: FixedIncomeRow[]
  totalBRL: number
  isLoading: boolean
  calcFiValues: () => void
  calcFiState: string
  onAdd: () => void
}

export function FixedIncomeGroup({
  rows,
  totalBRL,
  isLoading,
  calcFiValues,
  calcFiState,
  onAdd,
}: FixedIncomeGroupProps) {
  // Inicia minimizado — o usuário expande quando quiser
  const [collapsed, setCollapsed] = useState(true)

  const hasStale = rows.some((r) => r.isStale)
  const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0)

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface">
        <div className="px-5 py-4">
          <p className="text-sm text-gray-400 animate-pulse">Carregando renda fixa…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface">
      {/* ── Header clicável — igual ao dos outros grupos ─────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCollapsed((v) => !v)
          }
        }}
        className="w-full px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-dark-bg/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-expanded={!collapsed}
        aria-controls="fi-group-body"
        aria-label={`Tesouro Direto — ${rows.length} ativo${rows.length !== 1 ? 's' : ''}, ${collapsed ? 'expandir' : 'recolher'}`}
      >
        {/* Ícone + label */}
        <span className="flex items-center gap-3 flex-shrink-0">
          <ClassIcon label="Tesouro Direto" color={FI_COLOR} />
          <span className="text-base font-semibold text-white">Tesouro Direto</span>
        </span>

        {/* Ativos */}
        <span className="flex flex-col items-start">
          <span className="text-xs text-gray-400">Ativos</span>
          <span className="text-sm font-medium text-white">{rows.length}</span>
        </span>

        {/* Valor total */}
        <span className="flex flex-col items-start ml-auto sm:ml-0">
          <span className="text-xs text-gray-400">Valor total</span>
          <span className="text-sm font-medium text-white tabular-nums">
            {rows.length === 0 ? '—' : fmtBRL(totalBRL)}
          </span>
        </span>

        {/* Alerta de valores desatualizados */}
        {hasStale && (
          <span className="text-xs text-amber-400 flex-shrink-0">
            ⚠ valores estimados
          </span>
        )}

        {/* Botão de atualizar — stopPropagation para não colapsar ao clicar */}
        {rows.length > 0 && (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <button
              type="button"
              onClick={calcFiValues}
              disabled={calcFiState === 'loading'}
              className="rounded-lg border border-gray-600 px-3 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calcFiState === 'loading' ? 'Calculando…' : '↻ Atualizar'}
            </button>
          </span>
        )}

        {/* Chevron */}
        <span
          className={`ml-auto flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            collapsed ? '-rotate-90' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* ── Corpo colapsável ─────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          id="fi-group-body"
          className="border-t border-dark-border"
        >
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">
                Nenhuma posição de renda fixa cadastrada.{' '}
                <button
                  type="button"
                  onClick={onAdd}
                  className="text-emerald-400 underline hover:text-emerald-300"
                >
                  Adicionar agora
                </button>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">Renda Fixa — posições</caption>
                <thead className="bg-dark-bg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Aplicado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Valor atual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Rendimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-dark-surface hover:bg-dark-bg/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-4 py-3 text-gray-300">{FIXED_INCOME_TYPE_LABEL[row.type]}</td>
                      <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                        {fmtBRL(row.principal)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.currentValue !== null ? (
                          <span className={row.isStale ? 'text-amber-300' : 'text-white'}>
                            {fmtBRL(row.currentValue)}
                            {row.isStale && (
                              <Tooltip label="Valor desatualizado — clique em Atualizar">
                                <span className="block text-xs text-amber-400">estimado</span>
                              </Tooltip>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.gainBRL !== null && row.gainPercent !== null ? (
                          <span className={row.gainBRL >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {row.gainBRL >= 0 ? '+' : ''}{fmtBRL(row.gainBRL)}{' '}
                            <span className="text-xs opacity-80">
                              ({row.gainPercent >= 0 ? '+' : ''}{row.gainPercent.toFixed(2)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {row.maturity_date
                          ? new Date(row.maturity_date + 'T12:00:00').toLocaleDateString('pt-BR')
                          : <span className="text-gray-500">Sem venc.</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-dark-border bg-dark-surface/50">
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white tabular-nums">
                      {fmtBRL(totalPrincipal)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white tabular-nums">
                      {fmtBRL(totalBRL)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
