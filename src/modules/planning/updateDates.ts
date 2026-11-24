export const valid = (value?: string | null): value is string => Boolean(value && Number.isFinite(Date.parse(value)))
export const timestamp = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
const reference = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : timestamp(value)
export function updateRange(values: (string | null | undefined)[], withTime = true): string {
  const ordered = values.filter(valid).sort((a, b) => Date.parse(a) - Date.parse(b))
  if (!ordered.length) return 'Não informada pela fonte'
  const format = withTime ? timestamp : reference
  const first = format(ordered[0]), last = format(ordered[ordered.length - 1])
  return first === last ? first : `${first} a ${last}`
}
