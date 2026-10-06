/**
 * ProventosChart — gráfico de barras SVG de proventos mensais.
 * Recebe MonthlyBar[] já calculado por buildMonthlyBars.
 */
import type { MonthlyBar } from '../../dividends/types'

type Props = {
  bars: MonthlyBar[]
  /** Número máximo de barras a exibir (mais recentes). Default: 8 */
  maxBars?: number
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function fmtMonth(yyyyMM: string): string {
  const [, mm] = yyyyMM.split('-')
  return MONTH_LABELS[mm] ?? mm
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

export function ProventosChart({ bars, maxBars = 8 }: Props) {
  if (bars.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center">
        <p className="text-[12px] text-[#8F8F8F]">Sem proventos no período</p>
      </div>
    )
  }

  const visible = bars.slice(-maxBars)
  const maxVal = Math.max(...visible.map((b) => b.total), 1)

  const W = 752
  const H = 140
  const PAD_B = 18  // espaço labels eixo X
  const PAD_L = 0
  const n = visible.length
  const colW = (W - PAD_L) / n
  const BAR_W = Math.min(36, colW * 0.55)
  const BLUE = '#7987FF'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Proventos por mês"
      role="img"
    >
      {visible.map((bar, i) => {
        const bh = Math.max(2, ((bar.total / maxVal) * (H - PAD_B - 8)))
        const cx = PAD_L + i * colW + colW / 2
        const isLast = i === n - 1
        return (
          <g
            key={bar.month}
            aria-label={`${fmtMonth(bar.month)}: ${fmtBRL(bar.total)}`}
          >
            <rect
              x={cx - BAR_W / 2}
              y={H - PAD_B - bh}
              width={BAR_W}
              height={bh}
              rx={4}
              fill={BLUE}
              fillOpacity={isLast ? 1 : 0.55}
            />
            {/* Label valor da última barra */}
            {isLast && (
              <text
                x={cx}
                y={H - PAD_B - bh - 5}
                textAnchor="middle"
                fontSize={9.5}
                fill={BLUE}
                fontWeight={500}
              >
                {fmtBRL(bar.total)}
              </text>
            )}
            {/* Label mês */}
            <text
              x={cx}
              y={H - 2}
              textAnchor="middle"
              fontSize={9.5}
              fill="#8F8F8F"
            >
              {fmtMonth(bar.month)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
