import { z } from 'zod'
import { NewPosition } from '../types'

/**
 * Converte número digitado no formato brasileiro para o formato aceito pelo
 * Postgres. `10,50` vira `10.5`; `1.234,56` vira `1234.56`.
 *
 * Regra: a vírgula é o separador decimal, então quando ela existe os pontos
 * são separadores de milhar e desaparecem. Sem vírgula, o ponto é o separador
 * decimal e fica onde está — `10.50` continua valendo 10,5.
 *
 * Devolve `NaN` para qualquer entrada que não seja um número, o que o schema
 * traduz em erro de campo.
 */
export function parseDecimalPtBr(raw: string): number {
  const cleaned = raw
    .replace(/\s|\u00a0/g, '')
    .replace(/^R\$/i, '')
    .trim()

  if (!cleaned) return Number.NaN

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned

  // `Number('')` é 0 e `Number('1e3')` é 1000: restringe ao que é dígito com
  // no máximo um separador decimal e sinal opcional.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN

  return Number(normalized)
}

const decimalField = (invalidMessage: string) =>
  z
    .string()
    .refine((value) => Number.isFinite(parseDecimalPtBr(value)), invalidMessage)

/** `YYYY-MM-DD` que também é um dia real do calendário. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const [, year, month, day] = match
  const date = new Date(`${value}T00:00:00Z`)

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  )
}

export const positionSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Informe o ticker do ativo')
    .max(20, 'Ticker inválido'),
  quantity: decimalField('Quantidade inválida. Use números, por exemplo 10,5')
    .refine((value) => parseDecimalPtBr(value) > 0, 'Quantidade deve ser maior que zero'),
  averagePrice: decimalField('Preço médio inválido. Use números, por exemplo 32,10')
    .refine((value) => parseDecimalPtBr(value) >= 0, 'Preço médio não pode ser negativo'),
  acquisitionDate: z
    .string()
    .min(1, 'Informe a data de aquisição')
    .refine(isCalendarDate, 'Data inválida'),
})

export type PositionSchema = z.infer<typeof positionSchema>

/**
 * Converte os campos do formulário no payload de escrita: ticker em
 * maiúsculas e decimais já normalizados.
 */
export function toNewPosition(values: PositionSchema): NewPosition {
  return {
    ticker: values.ticker.trim().toUpperCase(),
    quantity: parseDecimalPtBr(values.quantity),
    average_price: parseDecimalPtBr(values.averagePrice),
    acquisition_date: values.acquisitionDate,
  }
}
