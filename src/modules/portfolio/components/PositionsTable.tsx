import { PositionWithAsset } from '../types'

interface PositionsTableProps {
  positions: PositionWithAsset[]
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

/**
 * O preço médio está na moeda do ativo (`assets.currency`), não sempre em
 * BRL — rotular um stock americano como R$ seria número errado na tela.
 * Conversão para BRL e valor de mercado são da Story 2.3.
 */
function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
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

/** Numeric do Postgres pode chegar como string dependendo do serializador. */
function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

const CELL_CLASS = 'px-4 py-3 text-sm text-gray-200'
const HEADER_CLASS = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

export function PositionsTable({ positions }: PositionsTableProps) {
  if (positions.length === 0) {
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
            <th scope="col" className={HEADER_CLASS}>
              Ticker
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Nome
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Quantidade
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Preço médio
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Data de aquisição
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.id} className="border-t border-dark-border">
              <th scope="row" className={`${CELL_CLASS} text-left font-semibold text-white`}>
                {position.ticker}
              </th>
              <td className={CELL_CLASS}>{position.asset?.name ?? '—'}</td>
              <td className={`${CELL_CLASS} text-right`}>
                {quantityFormatter.format(toNumber(position.quantity))}
              </td>
              <td className={`${CELL_CLASS} text-right`}>
                {formatMoney(toNumber(position.average_price), position.asset?.currency ?? 'BRL')}
              </td>
              <td className={CELL_CLASS}>{formatDate(position.acquisition_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
