import { Link } from 'react-router-dom'
import { Tooltip } from '../../../shared/components/Tooltip'
import { RowActionsMenu } from './RowActionsMenu'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'
import type { ColumnId } from '../hooks/useColumnVisibility'

interface PositionsTableProps {
  rows: PositionRow[]
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
  scoreByTicker?: Map<string, number | null>
  fundamentalsUpdatedAt?: Map<string, string>
  /** Colunas opcionais visíveis. Quando ausente, usa o conjunto padrão. */
  visibleColumns?: Set<ColumnId>
}

// ─── formatadores ──────────────────────────────────────────────────────────────

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

const plainMoneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const signedPercentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const MISSING = '—'

function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)
}

function formatMoney(value: number, currency: unknown): string {
  if (!Number.isFinite(value)) return MISSING
  if (!isCurrencyCode(currency)) return plainMoneyFormatter.format(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return quantityFormatter.format(value)
}

function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING
  return `${signedPercentFormatter.format(value)}%`
}

function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING
  return decimalFormatter.format(value)
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return isoDate
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

function formatTimestamp(value: string): string {
  if (typeof value !== 'string' || value.trim() === '') return MISSING
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return timestampFormatter.format(parsed)
}

function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0)
    return 'text-gray-200'
  return value > 0 ? 'text-green-400' : 'text-red-400'
}

const STALE_FUNDAMENTALS_MS = 90 * 24 * 60 * 60 * 1000

function isStaleFundamentals(updatedAt: string | undefined): boolean {
  if (!updatedAt) return false
  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) return false
  return Date.now() - parsed.getTime() > STALE_FUNDAMENTALS_MS
}

// ─── componentes auxiliares ───────────────────────────────────────────────────

function QuoteCell({ row }: { row: PositionRow }) {
  const { quote } = row
  if (!quote) return <span>{MISSING}</span>
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center justify-end gap-2">
        {formatMoney(row.quotePrice, row.currency)}
        <Tooltip label={`Procedência da cotação de ${row.ticker}`}>
          <span className="block font-semibold text-white">Cotação de {row.ticker}</span>
          <span className="mt-1 block">Fonte: {quote.source || MISSING}</span>
          <span className="block">Fechamento: {formatDate(quote.date)}</span>
          <span className="block">Registrado em: {formatTimestamp(quote.updated_at)}</span>
        </Tooltip>
      </span>
      {row.isStaleQuote && (
        <span className="whitespace-nowrap text-xs font-medium text-amber-300">
          ⚠️ Cotação antiga
        </span>
      )}
    </span>
  )
}

export const CELL_CLASS = 'px-4 py-3 text-sm text-gray-200'
export const HEADER_CLASS =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

function ariaSort(sort: PositionSort, column: PositionSortColumn) {
  if (sort.column !== column) return 'none' as const
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const)
}

interface SortableHeaderProps {
  column: PositionSortColumn
  label: string
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
  align?: 'left' | 'right'
}

export function SortableHeader({
  column,
  label,
  sort,
  onSortChange,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = sort.column === column
  const alignment = align === 'right' ? 'text-right' : 'text-left'
  return (
    <th
      scope="col"
      aria-sort={ariaSort(sort, column)}
      className={`${HEADER_CLASS} ${alignment}`}
    >
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isActive ? 'text-white' : 'text-gray-400'
        }`}
      >
        {label}
        <span aria-hidden="true">
          {isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}

// ─── PositionsTable (tabela plana, não usada no layout principal) ─────────────

export function PositionsTable({
  rows,
  sort,
  onSortChange,
  scoreByTicker,
  fundamentalsUpdatedAt,
  visibleColumns,
}: PositionsTableProps) {
  const vis = visibleColumns
  const show = (col: ColumnId) => !vis || vis.has(col)

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-dark-border p-10 text-center">
        <p className="font-medium text-gray-300">Nenhuma posição cadastrada</p>
        <p className="mt-1 text-sm text-gray-400">
          Use "+ adicionar posição" para registrar o primeiro ativo da sua carteira.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-dark-border">
      <table className="w-full border-collapse">
        <caption className="sr-only">Posições cadastradas na carteira</caption>
        <thead className="bg-dark-bg">
          <tr>
            <SortableHeader column="ticker" label="Ticker" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className={HEADER_CLASS}>Nome</th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>Quantidade</th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>Preço médio</th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>Cotação</th>
            {show('saldo') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Saldo</th>}
            {show('peso') && <SortableHeader column="weight" label="% Carteira" sort={sort} onSortChange={onSortChange} align="right" />}
            <SortableHeader column="change" label="Variação" sort={sort} onSortChange={onSortChange} align="right" />
            {show('proventos') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Proventos (12M)</th>}
            {show('payout') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Payout %</th>}
            {show('pl') && <th scope="col" className={`${HEADER_CLASS} text-right`}>P/L</th>}
            {show('pvp') && <th scope="col" className={`${HEADER_CLASS} text-right`}>P/VP</th>}
            {show('dy') && <th scope="col" className={`${HEADER_CLASS} text-right`}>DY %</th>}
            {show('yieldOnCost') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Yield on Cost</th>}
            {show('graham') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Preço Justo (Graham)</th>}
            {show('bazin') && <th scope="col" className={`${HEADER_CLASS} text-right`}>Preço-Teto Bazin</th>}
            {show('score') && scoreByTicker && (
              <SortableHeader column="score" label="Score" sort={sort} onSortChange={onSortChange} align="right" />
            )}
            {show('aquisicao') && <th scope="col" className={HEADER_CLASS}>Aquisição</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PositionRow
              key={row.id}
              row={row}
              scoreByTicker={scoreByTicker}
              fundamentalsUpdatedAt={fundamentalsUpdatedAt}
              visibleColumns={vis}
              showActions={false}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── PositionRows: tbody reutilizável ─────────────────────────────────────────

export interface PositionRowsProps {
  rows: PositionRow[]
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
  scoreByTicker?: Map<string, number | null>
  fundamentalsUpdatedAt?: Map<string, string>
  showActions?: boolean
  visibleColumns?: Set<ColumnId>
}

export function PositionRows({
  rows,
  scoreByTicker,
  fundamentalsUpdatedAt,
  showActions = false,
  visibleColumns,
}: PositionRowsProps) {
  return (
    <>
      {rows.map((row) => (
        <PositionRow
          key={row.id}
          row={row}
          scoreByTicker={scoreByTicker}
          fundamentalsUpdatedAt={fundamentalsUpdatedAt}
          showActions={showActions}
          visibleColumns={visibleColumns}
        />
      ))}
    </>
  )
}

// ─── PositionRow: linha individual ────────────────────────────────────────────

interface PositionRowProps {
  row: PositionRow
  scoreByTicker?: Map<string, number | null>
  fundamentalsUpdatedAt?: Map<string, string>
  showActions?: boolean
  visibleColumns?: Set<ColumnId>
}

function PositionRow({
  row,
  scoreByTicker,
  fundamentalsUpdatedAt,
  showActions = false,
  visibleColumns,
}: PositionRowProps) {
  const show = (col: ColumnId) => !visibleColumns || visibleColumns.has(col)

  return (
    <tr className="border-t border-dark-border hover:bg-dark-surface/40 transition-colors">
      {/* Ticker */}
      <th scope="row" className={`${CELL_CLASS} text-left font-semibold text-white`}>
        <Link
          to={`/ativo/${row.ticker}`}
          className="hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          {row.ticker}
        </Link>
      </th>

      {/* Nome */}
      <td className={`${CELL_CLASS} max-w-[140px] truncate`}>{row.name ?? MISSING}</td>

      {/* Quantidade */}
      <td className={`${CELL_CLASS} text-right`}>{formatQuantity(row.quantity)}</td>

      {/* Preço médio */}
      <td className={`${CELL_CLASS} text-right`}>
        {formatMoney(row.averagePrice, row.currency)}
      </td>

      {/* Cotação */}
      <td className={`${CELL_CLASS} text-right`}>
        <QuoteCell row={row} />
      </td>

      {/* Saldo (valor de mercado) */}
      {show('saldo') && (
        <td className={`${CELL_CLASS} text-right`}>{formatBRL(row.marketValueBRL)}</td>
      )}

      {/* % na Carteira */}
      {show('peso') && (
        <td className={`${CELL_CLASS} text-right`}>{formatWeight(row.weightPercent)}</td>
      )}

      {/* Variação — sempre visível */}
      <td className={`${CELL_CLASS} text-right ${changeColor(row.changePercent)}`}>
        {formatChange(row.changePercent)}
      </td>

      {/* Proventos recebidos 12M */}
      {show('proventos') && (
        <td className={`${CELL_CLASS} text-right text-green-400`}>
          {formatBRL(row.proventosRecebidosBRL)}
        </td>
      )}

      {/* Payout % */}
      {show('payout') && (
        <td className={`${CELL_CLASS} text-right`}>{formatPct(row.payoutPercent)}</td>
      )}

      {/* P/L */}
      {show('pl') && (
        <td className={`${CELL_CLASS} text-right`}>{formatDecimal(row.pl)}</td>
      )}

      {/* P/VP */}
      {show('pvp') && (
        <td className={`${CELL_CLASS} text-right`}>{formatDecimal(row.pvp)}</td>
      )}

      {/* DY % */}
      {show('dy') && (
        <td className={`${CELL_CLASS} text-right`}>{formatPct(row.dy)}</td>
      )}

      {/* Yield on Cost */}
      {show('yieldOnCost') && (
        <td className={`${CELL_CLASS} text-right text-green-400`}>
          {formatPct(row.yieldOnCostPercent)}
        </td>
      )}

      {/* Preço Justo Graham */}
      {show('graham') && (
        <td className={`${CELL_CLASS} text-right`}>
          {row.grahamPrice !== null && row.grahamPrice !== undefined ? (
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-white">{formatBRL(row.grahamPrice)}</span>
              {Number.isFinite(row.quotePrice) && row.quotePrice > 0 && (
                <span className={`text-xs ${row.quotePrice <= row.grahamPrice ? 'text-green-400' : 'text-red-400'}`}>
                  {row.quotePrice <= row.grahamPrice ? '▼ abaixo' : '▲ acima'}
                </span>
              )}
            </span>
          ) : MISSING}
        </td>
      )}

      {/* Preço-Teto Bazin */}
      {show('bazin') && (
        <td className={`${CELL_CLASS} text-right`}>
          {row.bazinCeiling !== null && row.bazinCeiling !== undefined ? (
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-white">{formatBRL(row.bazinCeiling)}</span>
              {Number.isFinite(row.quotePrice) && row.quotePrice > 0 && (
                <span className={`text-xs ${row.quotePrice <= row.bazinCeiling ? 'text-green-400' : 'text-red-400'}`}>
                  {row.quotePrice <= row.bazinCeiling ? '▼ abaixo' : '▲ acima'}
                </span>
              )}
            </span>
          ) : MISSING}
        </td>
      )}

      {/* Score */}
      {show('score') && scoreByTicker && (
        <td className={`${CELL_CLASS} text-right font-mono`}>
          {(() => {
            const score = scoreByTicker.get(row.ticker)
            if (score === undefined || score === null) {
              return <span className="text-gray-500">N/A</span>
            }
            const updatedAt = fundamentalsUpdatedAt?.get(row.ticker)
            const stale = isStaleFundamentals(updatedAt)
            return (
              <span className="inline-flex items-center justify-end gap-1">
                <span
                  className={
                    score > 0
                      ? 'text-green-400'
                      : score < 0
                        ? 'text-red-400'
                        : 'text-gray-200'
                  }
                >
                  {score > 0 ? `+${score}` : `${score}`}
                </span>
                {stale && (
                  <Tooltip label={`Dados fundamentalistas de ${row.ticker}`}>
                    <span className="block font-semibold text-white">Dados de {row.ticker}</span>
                    <span className="mt-1 block text-amber-300">
                      ⚠️ Dados antigos (mais de 90 dias)
                    </span>
                  </Tooltip>
                )}
              </span>
            )
          })()}
        </td>
      )}

      {/* Data de aquisição */}
      {show('aquisicao') && (
        <td className={CELL_CLASS}>{formatDate(row.acquisitionDate)}</td>
      )}

      {/* Opções */}
      {showActions && (
        <td className={`${CELL_CLASS} text-right`}>
          <RowActionsMenu
            positionId={row.id}
            ticker={row.ticker}
            assetType={row.type}
            assetName={row.name}
          />
        </td>
      )}
    </tr>
  )
}
