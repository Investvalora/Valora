import type { DashboardData } from '../../dashboard/hooks/useDashboard'

type MonthlySeries = DashboardData['monthlySeries']

const H = 180
const PAD_L = 46
const PAD_B = 20
const BAR_W = 38

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function labelForMonth(month: string) {
  return monthLabel.format(new Date(`${month}-01T00:00:00Z`)).replace('.', '')
}

export function EvolucaoChart({ data }: { data: MonthlySeries }) {
  const points = data.slice(-7)

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-[#8F8F8F]">Ainda não há histórico para esta carteira.</p>
  }

  const totalW = 640
  const maxValue = Math.max(1, ...points.map((point) => point.totalBRL ?? 0))
  const step = Math.pow(10, Math.floor(Math.log10(maxValue / 3)))
  const gridStep = Math.ceil(maxValue / (3 * step)) * step
  const axisMax = gridStep * 3
  const colW = (totalW - PAD_L) / points.length
  const toY = (value: number) => H - (value / axisMax) * H

  return (
    <svg viewBox={`0 0 ${totalW} ${H + PAD_B}`} className="w-full" aria-label="Gráfico de evolução do patrimônio" role="img">
      {[0, 1, 2, 3].map((index) => {
        const value = index * gridStep
        const y = toY(value)
        return (
          <g key={index}>
            <line x1={PAD_L} y1={y} x2={totalW} y2={y} stroke={index === 0 ? '#555' : 'rgba(255,255,255,0.08)'} strokeWidth={1} strokeDasharray={index === 0 ? undefined : '3 4'} />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#8F8F8F">
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

        return (
          <g key={point.month} aria-label={`${label}: Aplicado ${money.format(invested)}, ganho ${money.format(gain)}`}>
            <rect x={cx - BAR_W / 2} y={toY(invested)} width={BAR_W} height={(invested / axisMax) * H} fill="rgba(51,170,59,0.8)" />
            {gain > 0 && <rect x={cx - BAR_W / 2} y={toY(total)} width={BAR_W} height={(gain / axisMax) * H} rx={3} fill="rgba(169,224,172,0.8)" />}
            {index === points.length - 1 && total > 0 && (
              <text x={cx} y={Math.max(10, toY(total) - 6)} textAnchor="middle" fontSize={11} fontWeight={500} fill="white">
                {money.format(total)}
              </text>
            )}
            <text x={cx} y={H + PAD_B - 2} textAnchor="middle" fontSize={11} fill="#8F8F8F">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}
