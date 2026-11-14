import type { PerformanceSeries } from '../types'

export function comparisonChart(series: PerformanceSeries[]) {
  const valid = (value: number) => value !== null && Number.isFinite(value)
  const portfolioDates = series.find((item) => item.label === 'Carteira')?.points.filter((point) => valid(point.normalized)).map((point) => point.date).sort() ?? []
  const from = portfolioDates[0]
  const until = portfolioDates[portfolioDates.length - 1]
  const visible = series.map((item) => ({ ...item, points: item.points.filter((point) => (!from || point.date >= from) && (!until || point.date <= until)) }))
  
  // Coleta todas as datas válidas (onde há pelo menos um ponto com valor válido)
  const validDates = visible.flatMap(item => item.points.filter(point => valid(point.normalized)).map(point => point.date)).sort()
  
  // Mantém apenas datas dentro do intervalo válido
  const dates = [...new Set(visible.flatMap((item) => item.points.map((point) => point.date)))].sort()
    .filter(date => validDates.length > 0 && date >= validDates[0] && date <= validDates[validDates.length - 1])
  
  // Cria dataKey único para cada série
  const keyedSeries = visible.map((item, index) => ({ ...item, dataKey: `series${index}` }))
  
  // Cria lookup map para cada série: date -> normalized value
  const lookup = keyedSeries.map(item => new Map(item.points.map(point => [point.date, point.normalized])))
  
  // Constrói os dados para o Recharts - cada data é uma entrada com valores de todas as séries
  const data: Array<{ date: number } & Record<string, number | null>> = dates.map(date => {
    const entry: any = { date: Date.parse(`${date}T12:00:00Z`) }
    // Para cada série, pega o valor da data ou null se não existir
    keyedSeries.forEach((item, index) => {
      entry[item.dataKey] = lookup[index].get(date) ?? null
    })
    return entry
  })
  
  // Calcula o domínio do eixo Y
  const values = visible.flatMap((item) => item.points.map((point) => point.normalized).filter(valid))
  const low = Math.min(100, ...values), high = Math.max(100, ...values)
  const padding = Math.max(1, (high - low) * 0.15)
  
  return { 
    series: keyedSeries, 
    dates, 
    data, 
    domain: [Math.floor(low - padding), Math.ceil(high + padding)] as [number, number] 
  }
}
