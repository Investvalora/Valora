import { Tooltip } from '../../../shared/components/Tooltip'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'

interface PositionsTableProps {
  /** Linhas já derivadas pelo pai: peso e valor de mercado dependem do total. */
  rows: PositionRow[]
  sort: PositionSort
  onSortChange: (column: PositionSortColumn) => void
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

/** Fallback de moeda inválida: número certo sem rótulo, em vez de rótulo errado. */
const plainMoneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** Valor de mercado e total são sempre em BRL — é a moeda da carteira. */
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

/** `+3,45%` / `-1,20%`: o sinal explícito distingue alta de baixa sem cor. */
const signedPercentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** Exibido quando o valor não é um número — melhor lacuna honesta que `NaN`. */
const MISSING = '—'

/**
 * ISO 4217 é exatamente três letras, e é o que `Intl.NumberFormat` exige: com
 * qualquer outra coisa em `currency` ele lança `RangeError` e derruba a tabela
 * inteira. Um código de três letras desconhecido não lança — só aparece como
 * texto —, então validar a forma basta.
 */
function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)
}

/**
 * Preço médio e cotação estão na moeda do ativo (`assets.currency`), não em
 * BRL — rotular um stock americano como R$ seria número errado na tela. Só
 * valor de mercado e peso são convertidos, e esses vão em BRL.
 *
 * Moeda ausente ou malformada cai no formato sem rótulo: assumir BRL seria
 * inventar a informação que está faltando.
 */
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

/** Quantidade formatada, ou lacuna quando o valor não é numérico. */
function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return quantityFormatter.format(value)
}

function formatBRL(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatWeight(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

function formatChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return `${signedPercentFormatter.format(value)}%`
}

/**
 * `YYYY-MM-DD` para `DD/MM/YYYY` sem passar por `Date`: `new Date('2026-01-05')`
 * é interpretado em UTC e exibiria o dia anterior em fuso negativo.
 */
function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return isoDate

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * `updated_at` é TIMESTAMPTZ, com instante completo — aqui `Date` é o caminho
 * certo (a string traz o offset, não há o que inferir) e o valor é exibido no
 * fuso do usuário. Só o formato `YYYY-MM-DD` puro precisava do tratamento
 * manual de `formatDate`.
 */
function formatTimestamp(value: string): string {
  if (typeof value !== 'string' || value.trim() === '') return MISSING

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return timestampFormatter.format(parsed)
}

const CELL_CLASS = 'px-4 py-3 text-sm text-gray-200'
const HEADER_CLASS = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

/** `aria-sort` só é válido na coluna ativa; as demais declaram `none`. */
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

function SortableHeader({ column, label, sort, onSortChange, align = 'left' }: SortableHeaderProps) {
  const isActive = sort.column === column
  const alignment = align === 'right' ? 'text-right' : 'text-left'

  return (
    <th scope="col" aria-sort={ariaSort(sort, column)} className={`${HEADER_CLASS} ${alignment}`}>
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isActive ? 'text-white' : 'text-gray-400'
        }`}
      >
        {label}
        {/* A seta é redundante com `aria-sort`, então fica fora da árvore de
            acessibilidade — anunciar "seta para baixo" depois de "ordenado
            decrescente" é ruído. */}
        <span aria-hidden="true">{isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )
}

/** Procedência da cotação: fonte, dia do fechamento e gravação da linha. */
function QuoteCell({ row }: { row: PositionRow }) {
  const { quote } = row

  if (!quote) {
    return <span>{MISSING}</span>
  }

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
        // amber-300 sobre `dark-bg` passa o AA de texto normal; amber-400/500
        // ficariam no limite quando aplicados a texto pequeno.
        <span className="whitespace-nowrap text-xs font-medium text-amber-300">
          ⚠️ Cotação antiga
        </span>
      )}
    </span>
  )
}

/** Verde para alta, vermelho para baixa — o sinal no número carrega o mesmo. */
function changeColor(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value === 0) return 'text-gray-200'
  return value > 0 ? 'text-green-400' : 'text-red-400'
}

export function PositionsTable({ rows, sort, onSortChange }: PositionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-dark-border p-10 text-center">
        <p className="font-medium text-gray-300">Nenhuma posição cadastrada</p>
        {/* gray-400 e não gray-500: sobre `dark-bg`, gray-500 fica em 3,7:1 e
            reprova o AA de texto normal (4,5:1). */}
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
            <th scope="col" className={HEADER_CLASS}>
              Nome
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Quantidade
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Preço médio
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Cotação
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Valor de mercado
            </th>
            <SortableHeader
              column="weight"
              label="Peso"
              sort={sort}
              onSortChange={onSortChange}
              align="right"
            />
            <SortableHeader
              column="change"
              label="Variação"
              sort={sort}
              onSortChange={onSortChange}
              align="right"
            />
            <th scope="col" className={HEADER_CLASS}>
              Data de aquisição
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-dark-border">
              <th scope="row" className={`${CELL_CLASS} text-left font-semibold text-white`}>
                {row.ticker}
              </th>
              <td className={CELL_CLASS}>{row.name ?? MISSING}</td>
              <td className={`${CELL_CLASS} text-right`}>{formatQuantity(row.quantity)}</td>
              <td className={`${CELL_CLASS} text-right`}>
                {formatMoney(row.averagePrice, row.currency)}
              </td>
              <td className={`${CELL_CLASS} text-right`}>
                <QuoteCell row={row} />
              </td>
              <td className={`${CELL_CLASS} text-right`}>{formatBRL(row.marketValueBRL)}</td>
              <td className={`${CELL_CLASS} text-right`}>{formatWeight(row.weightPercent)}</td>
              <td className={`${CELL_CLASS} text-right ${changeColor(row.changePercent)}`}>
                {formatChange(row.changePercent)}
              </td>
              <td className={CELL_CLASS}>{formatDate(row.acquisitionDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
