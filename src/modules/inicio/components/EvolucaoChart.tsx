import { useId } from 'react'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'

type MonthlySeries = DashboardData['monthlySeries']

const H = 260
const PAD_T = 28
const PAD_L = 66
const PAD_B = 44

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function labelForMonth(month: string) {
  return `${monthLabel.format(new Date(`${month}-01T00:00:00Z`)).replace('.', '')}/${month.slice(2, 4)}`
}

export function EvolucaoChart({ data }: { data: MonthlySeries }) {
  const chartId = useId()
  const points = data

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-[#8F8F8F]">Sem dados para o período e tipo selecionados.</p>
  }

  const totalW = Math.max(960, points.length * 64 + PAD_L)
  const maxValue = Math.max(1, ...points.map((point) => point.totalBRL ?? 0))
  const step = Math.pow(10, Math.floor(Math.log10(maxValue / 6)))
  const gridStep = Math.ceil(maxValue / (6 * step)) * step
  const axisMax = Math.ceil(maxValue / gridStep) * gridStep
  const gridCount = Math.round(axisMax / gridStep)
  const colW = (totalW - PAD_L) / points.length
  const barWidth = Math.min(64, colW * 0.68)
  const baseline = PAD_T + H
  const toY = (value: number) => baseline - (value / axisMax) * H

  return (
    <svg viewBox={`0 0 ${totalW} ${baseline + PAD_B}`} className="block w-full" aria-label="Gráfico de evolução do patrimônio" role="img">
      {Array.from({ length: gridCount + 1 }, (_, index) => index).map((index) => {
        const value = index * gridStep
        const y = toY(value)
        return (
          <g key={index}>
            <line x1={PAD_L} y1={y} x2={totalW} y2={y} stroke={index === 0 ? '#555' : 'rgba(255,255,255,0.08)'} strokeWidth={1} strokeDasharray={index === 0 ? undefined : '3 4'} />
            <text x={PAD_L - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#8F8F8F">
              {value === 0 ? 'R$ 0' : `R$ ${compactNumber.format(value)}`}
            </text>
          </g>
        )
      })}

      {points.map((point, index) => {
        const total = Math.max(0, point.totalBRL ?? 0)
        const invested = Math.min(total, Math.max(0, point.investedBRL ?? 0))
        const gain = total - invested
        const cx = PAD_L + index * colW + colW / 2
        const label = labelForMonth(point.month)
        const x = cx - barWidth / 2
        const y = toY(total)
        const radius = Math.min(4, (baseline - y) / 2)
        const gainOffset = total > 0 ? `${(gain / total) * 100}%` : '0%'
        const fillId = `${chartId}-bar-${index}`

        return (
          <g key={point.month} aria-label={`${label}: Aplicado ${money.format(invested)}, ganho ${money.format(gain)}`}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(169,224,172,0.8)" />
                <stop offset={gainOffset} stopColor="rgba(169,224,172,0.8)" />
                <stop offset={gainOffset} stopColor="rgba(51,170,59,0.8)" />
                <stop offset="100%" stopColor="rgba(51,170,59,0.8)" />
              </linearGradient>
            </defs>
            <path
              d={`M ${x} ${baseline} V ${y + radius} Q ${x} ${y} ${x + radius} ${y} H ${x + barWidth - radius} Q ${x + barWidth} ${y} ${x + barWidth} ${y + radius} V ${baseline} Z`}
              fill={`url(#${fillId})`}
            />
            {index === points.length - 1 && total > 0 && (
              <text x={cx} y={Math.max(10, toY(total) - 6)} textAnchor="middle" fontSize={11} fontWeight={500} fill="white">
                {money.format(total)}
              </text>
            )}
            <text x={cx} y={baseline + 24} textAnchor="middle" fontSize={12} fill="#8F8F8F">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}
