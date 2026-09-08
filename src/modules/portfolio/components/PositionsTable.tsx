import { PositionWithAsset } from '../types'

interface PositionsTableProps {
  positions: PositionWithAsset[]
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
 * O preço médio está na moeda do ativo (`assets.currency`), não sempre em
 * BRL — rotular um stock americano como R$ seria número errado na tela.
 * Conversão para BRL e valor de mercado são da Story 2.3.
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
 * Numeric do Postgres pode chegar como string dependendo do serializador.
 *
 * String vazia é tratada como ilegível, e não como zero: `Number('')` é `0`, o
 * que exibiria "0" para um valor que ninguém informou — mesmo defeito de
 * `R$ NaN`, só mais difícil de notar.
 */
function toNumber(value: number | string): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN

  return Number(value)
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
                {formatQuantity(toNumber(position.quantity))}
              </td>
              <td className={`${CELL_CLASS} text-right`}>
                {formatMoney(toNumber(position.average_price), position.asset?.currency)}
              </td>
              <td className={CELL_CLASS}>{formatDate(position.acquisition_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
