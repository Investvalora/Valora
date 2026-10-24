import { create } from 'zustand'

export const CHART_PERIODS = [
  ['Tudo', 'Desde o início'], ['1M', 'Último mês'], ['3M', 'Últimos 3 meses'],
  ['6M', 'Últimos 6 meses'], ['1A', 'Últimos 12 meses'], ['2A', '2 anos'],
  ['5A', '5 anos'], ['10A', '10 anos'], ['custom', 'Data personalizada'],
] as const
export type ChartPeriod = typeof CHART_PERIODS[number][0]

export function chartDateRange(period: ChartPeriod, from: string, to: string, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  if (period === 'custom') return { from, to }
  if (period === 'Tudo') return { from: '1900-01-01', to: today }
  const months = { '1M': 1, '3M': 3, '6M': 6, '1A': 12, '2A': 24, '5A': 60, '10A': 120 }[period]
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1))
  return { from: start.toISOString().slice(0, 10), to: today }
}

export const useChartPeriod = create<{
  period: ChartPeriod
  from: string
  to: string
  setPeriod: (period: ChartPeriod) => void
  setFrom: (from: string) => void
  setTo: (to: string) => void
}>((set) => ({
  period: '1A', from: new Date().toISOString().slice(0, 7) + '-01', to: new Date().toISOString().slice(0, 10),
  setPeriod: (period) => set({ period }), setFrom: (from) => set({ from }), setTo: (to) => set({ to }),
}))
