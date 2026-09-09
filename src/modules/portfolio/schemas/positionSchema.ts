import { z } from 'zod'
import { NewPosition } from '../types'

/**
 * Mensagem do ponto sem vírgula. Exportada porque é asserida nos testes e
 * porque é a única mensagem compartilhada por quantidade e preço médio.
 */
export const AMBIGUOUS_DECIMAL_MESSAGE =
  'Use a vírgula para os decimais, por exemplo 10,50. O ponto vale só como separador de milhar, como em 1.500,00.'

/** Remove espaço, espaço fino e o prefixo `R$` antes de qualquer decisão. */
function cleanNumeric(raw: string): string {
  return raw
    .replace(/\s|\u00a0/g, '')
    .replace(/^R\$/i, '')
    .trim()
}

/**
 * `true` quando o valor tem ponto e não tem vírgula — caso em que não há como
 * saber se o ponto é milhar ou decimal.
 *
 * Não é uma sutileza de formatação: interpretar `1.500` como 1,5 grava um
 * valor financeiro 1000× menor em silêncio. A regra da matriz é recusar e
 * pedir a vírgula, nunca adivinhar.
 */
export function isAmbiguousDecimal(raw: string): boolean {
  const cleaned = cleanNumeric(raw)
  return cleaned.includes('.') && !cleaned.includes(',')
}

/**
 * Converte número digitado no formato brasileiro para o formato aceito pelo
 * Postgres. `10,50` vira `10.5`; `1.234,56` vira `1234.56`.
 *
 * Regra: a vírgula é o separador decimal, então quando ela existe os pontos
 * são separadores de milhar e desaparecem. Sem vírgula, um ponto torna a
 * entrada ambígua e ela é recusada (ver `isAmbiguousDecimal`); sem ponto e
 * sem vírgula, o valor é inteiro.
 *
 * Devolve `NaN` para qualquer entrada que não seja um número aceitável, o que
 * o schema traduz em erro de campo.
 */
export function parseDecimalPtBr(raw: string): number {
  const cleaned = cleanNumeric(raw)

  if (!cleaned) return Number.NaN
  if (isAmbiguousDecimal(cleaned)) return Number.NaN

  const normalized = cleaned.replace(/\./g, '').replace(',', '.')

  // `Number('')` é 0 e `Number('1e3')` é 1000: restringe ao que é dígito com
  // no máximo um separador decimal e sinal opcional.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN

  return Number(normalized)
}

/**
 * Campo decimal pt-BR. `superRefine` em vez de dois `refine` porque as duas
 * causas são exclusivas: valor ambíguo pede a vírgula, valor não numérico pede
 * um número — emitir as duas de uma vez confundiria em vez de orientar.
 */
const decimalField = (invalidMessage: string) =>
  z.string().superRefine((value, ctx) => {
    if (isAmbiguousDecimal(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMBIGUOUS_DECIMAL_MESSAGE })
      return
    }

    if (!Number.isFinite(parseDecimalPtBr(value))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalidMessage })
    }
  })

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

/**
 * Hoje no fuso local, como `YYYY-MM-DD`. Datas ISO nesse formato comparam
 * corretamente como texto, o que evita construir um `Date` só para comparar —
 * e evita o deslocamento de dia que `new Date('YYYY-MM-DD')` causa em fuso
 * negativo, por ser interpretado em UTC.
 */
function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
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
    .refine(isCalendarDate, 'Data inválida')
    // Data futura é impossível: não se adquire hoje o que só existirá amanhã.
    // A recusa é aqui e não no banco — ver o comentário da migration 006:
    // `CURRENT_DATE` é STABLE e o Postgres não a aceita num CHECK.
    .refine(
      (value) => !isCalendarDate(value) || value <= todayIsoDate(),
      'Data de aquisição não pode estar no futuro',
    ),
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
