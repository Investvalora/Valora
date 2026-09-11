import type { DividendRow, DividendSort, DividendSortColumn } from '../types'
import { formatDividendDate } from '../utils/formatDate'

interface DividendsTableProps {
  rows: DividendRow[]
  totalValue: number
  sort: DividendSort
  tickerFilter: string
  typeFilter: string
  availableTypes: string[]
  onSortChange: (column: DividendSortColumn) => void
  onTickerFilterChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlLongFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

function formatDate(value: string | null | undefined): string {
  return formatDividendDate(value)
}

/** Cabeçalho de coluna clicável para ordenação. */
function SortableHeader({
  label,
  column,
  sort,
  onSortChange,
}: {
  label: string
  column: DividendSortColumn
  sort: DividendSort
  onSortChange: (col: DividendSortColumn) => void
}) {
  const isActive = sort.column === column
  const ariaSort = isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-200 transition-colors"
      onClick={() => onSortChange(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <span aria-hidden="true" className="opacity-30">
            ↕
          </span>
        )}
      </span>
    </th>
  )
}

/**
 * Tabela de proventos por ativo.
 *
 * - Filtros inline por ticker (texto) e tipo (select)
 * - Cabeçalhos de `ex_date`, `total_value` e `ticker` clicáveis para ordenação
 * - Linha de total em destaque no rodapé
 * - Acessível: `<th scope="col">`, `aria-sort`
 */
export function DividendsTable({
  rows,
  totalValue,
  sort,
  tickerFilter,
  typeFilter,
  availableTypes,
  onSortChange,
  onTickerFilterChange,
  onTypeFilterChange,
}: DividendsTableProps) {
  return (
    <div className="rounded-xl border border-dark-border overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 p-4 bg-dark-surface border-b border-dark-border">
        <input
          type="text"
          value={tickerFilter}
          onChange={(e) => onTickerFilterChange(e.target.value)}
          placeholder="Filtrar por ticker…"
          aria-label="Filtrar por ticker"
          className="
            flex-1 min-w-[160px] rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5
            text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          aria-label="Filtrar por tipo de provento"
          className="
            rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5
            text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        >
          <option value="">Todos os tipos</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left" aria-label="Tabela de proventos por ativo">
          <thead className="bg-dark-surface">
            <tr>
              <SortableHeader label="Ticker" column="ticker" sort={sort} onSortChange={onSortChange} />
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Tipo
              </th>
              <SortableHeader label="Data COM" column="ex_date" sort={sort} onSortChange={onSortChange} />
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Data Pagamento
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Valor/Cota
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Quantidade
              </th>
              <SortableHeader label="Valor Total" column="total_value" sort={sort} onSortChange={onSortChange} />
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Nenhum provento no período
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={`${row.ticker}-${row.ex_date}-${index}`}
                  className="hover:bg-dark-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{row.ticker}</td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className="inline-block rounded px-1.5 py-0.5 bg-dark-border text-xs uppercase">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(row.ex_date)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(row.payment_date)}</td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                    {brlLongFormatter.format(row.value_per_share)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                    {quantityFormatter.format(row.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white tabular-nums">
                    {brlFormatter.format(row.total_value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-blue-600/40 bg-dark-surface">
                <td
                  colSpan={6}
                  className="px-4 py-3 text-sm font-semibold text-gray-300 text-right"
                >
                  Total do período:
                </td>
                <td className="px-4 py-3 text-right font-bold text-white tabular-nums text-base">
                  {brlFormatter.format(totalValue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
