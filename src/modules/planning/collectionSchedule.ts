// Agendas UTC conferidas em cron.job (produção) em 24/11/2026.
// Projeção da tentativa de coleta; não representa publicação ou conclusão por ativo.
export type DataCategory = 'Cotações' | 'Proventos' | 'Fundamentos' | 'Tesouro'
type Schedule = { minutes: number[]; hours?: number[]; weekdays?: boolean }
const every = (step: number, start = 0) => Array.from({ length: Math.ceil((60 - start) / step) }, (_, i) => start + i * step)
const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)
export function nextCollection(category: DataCategory, now = Date.now()): string {
  const schedules: Record<DataCategory, Schedule[]> = {
    'Cotações': [{ minutes: every(10) }, { minutes: every(5), hours: range(13, 22), weekdays: true }, { minutes: [0, 30], hours: range(13, 19), weekdays: true }, { minutes: [30], hours: [21, 22, 23], weekdays: true }],
    'Proventos': [{ minutes: every(5) }, { minutes: every(5, 2) }, { minutes: every(5, 3) }, { minutes: [4, 19, 34, 49] }, { minutes: [11, 31, 51] }],
    'Fundamentos': [{ minutes: [0], hours: [21], weekdays: true }],
    'Tesouro': [{ minutes: [30], hours: [11, 22], weekdays: true }],
  }
  const firstMinute = Math.floor(now / 60000) * 60000 + 60000
  for (let time = firstMinute; time < firstMinute + 8 * 86400000; time += 60000) {
    const date = new Date(time)
    if (schedules[category].some(job => job.minutes.includes(date.getUTCMinutes()) && (!job.hours || job.hours.includes(date.getUTCHours())) && (!job.weekdays || ![0, 6].includes(date.getUTCDay())))) return date.toISOString()
  }
  throw new Error('Agenda sem próxima execução')
}
