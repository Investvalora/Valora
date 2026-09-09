/**
 * Datas `YYYY-MM-DD` tratadas como dia de calendário local.
 *
 * Todo o módulo existe para não passar por `new Date('2026-01-05')`: essa
 * string é lida como meia-noite **UTC** e, em fuso negativo, cai no dia 4. O
 * runner roda em `America/Sao_Paulo` (`vite.config.ts`) exatamente para que
 * essa classe de erro não passe verde.
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

const MS_PER_DAY = 86_400_000

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** `Date` → `YYYY-MM-DD` no fuso local. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * `YYYY-MM-DD` → meia-noite local, ou `null` quando a string não descreve uma
 * data real. O construtor por componentes rola overflow em silêncio
 * (`2026-02-31` viraria 03/03), então o resultado é reconferido.
 */
export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const monthIndex = Number(month) - 1
  const date = new Date(Number(year), monthIndex, Number(day))

  if (date.getMonth() !== monthIndex || date.getDate() !== Number(day)) return null
  return date
}

/**
 * Dia de calendário local deslocado em `days` (negativo anda para trás).
 * Somar no componente de dia deixa o próprio `Date` normalizar viradas de mês.
 */
export function shiftIsoDate(days: number, reference: Date = new Date()): string {
  return toIsoDate(
    new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + days),
  )
}

/**
 * Dias de calendário de `from` até `to` (`to - from`), ou `null` quando alguma
 * das datas é ilegível.
 *
 * O resultado é arredondado: uma eventual troca de offset entre as duas
 * meia-noites deslocaria a diferença em uma hora e truncaria um dia inteiro.
 */
export function isoDaysBetween(from: string, to: string): number | null {
  const start = parseIsoDate(from)
  const end = parseIsoDate(to)
  if (!start || !end) return null

  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/**
 * Dias úteis (seg–sex) estritamente ENTRE `from` e `to` — ou seja, quantos
 * pregões já fecharam depois de `from` e antes de `to`. `null` quando alguma
 * data é ilegível; `0` quando `to <= from`.
 *
 * Existe para a flag de cotação antiga: o fechamento de hoje só sai no fim do
 * pregão de hoje, então "hoje" não conta como atraso. Sexta→segunda é 0
 * (nada fechou entre elas: sábado e domingo não pregoam); quinta→segunda é 1
 * (só sexta). NÃO conhece feriados da B3 — limitação em deferred-work.
 */
export function businessDaysBetween(from: string, to: string): number | null {
  const start = parseIsoDate(from)
  const end = parseIsoDate(to)
  if (!start || !end) return null
  if (end.getTime() <= start.getTime()) return 0

  let count = 0
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  cursor.setDate(cursor.getDate() + 1)
  while (cursor.getTime() < end.getTime()) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}
