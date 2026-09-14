/**
 * Gráfico de barras mensais da evolução do patrimônio.
 *
 * Duas barras empilhadas por mês:
 *  - "Valor aplicado" = custo de aquisição (verde escuro)
 *  - "Ganho de Capital" = patrimônio − valor aplicado (verde claro)
 *
 * Target de React.lazy em ResumoDashboard — export default obrigatório.
 * `isAnimationActive={false}` evita timers pendentes no runner de testes.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const brlFull = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAxisY(value: number): string {
  if (!Number.isFinite(value)) return ''
  return brlCompact.format(value)
}

/** Formata `YYYY-MM` como `MMM/AA` (ex: jan/26). */
function formatMonth(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return yearMonth
  const [year, month] = yearMonth.split('-')
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                      'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const m = parseInt(month, 10)
  const label = monthNames[m - 1] ?? month
  return `${label}/${year.slice(2)}`
}

// ─── tooltip customizado ──────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const invested = payload.find((p) => p.name === 'Valor aplicado')
  const gain = payload.find((p) => p.name === 'Ganho de Capital')
  const total =
    (invested?.value ?? 0) + (gain?.value ?? 0)

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface px-4 py-3 shadow-xl text-xs leading-relaxed">
      <p className="font-semibold text-white mb-1.5">{formatMonth(label ?? '')}</p>
      {invested && (
        <p className="text-gray-300">
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: invested.fill }} />
          Valor aplicado: <span className="text-white">{brlFull.format(invested.value)}</span>
        </p>
      )}
      {gain && (
        <p className="text-gray-300">
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: gain.fill }} />
          Ganho de Capital: <span className="text-white">{brlFull.format(gain.value)}</span>
        </p>
      )}
      <p className="mt-1.5 border-t border-dark-border pt-1.5 font-semibold text-white">
        Total: {brlFull.format(total)}
      </p>
    </div>
  )
}

// ─── legenda customizada ──────────────────────────────────────────────────────

interface LegendItem {
  value: string
  color: string
}

function CustomLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-gray-400 mt-2">
      {items.map((item) => (
        <span key={item.value} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: item.color }} />
          {item.value}
        </span>
      ))}
    </div>
  )
}

// ─── props e dados ────────────────────────────────────────────────────────────

interface BarPoint {
  month: string
  totalBRL: number | null
  investedBRL: number | null
}

interface WealthBarChartProps {
  data: BarPoint[]
}

const COLOR_INVESTED = '#16a34a' // verde escuro — Valor Aplicado
const COLOR_GAIN = '#86efac'     // verde claro — Ganho de Capital

const LEGEND_ITEMS: LegendItem[] = [
  { value: 'Valor aplicado', color: COLOR_INVESTED },
  { value: 'Ganho de Capital', color: COLOR_GAIN },
]

export default function WealthBarChart({ data }: WealthBarChartProps) {
  // Transforma os pontos em dados para o BarChart empilhado:
  // - investedBRL = parte inferior (valor aplicado)
  // - gainBRL = parte superior (ganho de capital = total − investido)
  const chartData = data.map((point) => {
    const total = point.totalBRL ?? 0
    const invested = point.investedBRL ?? 0
    const gain = Math.max(0, total - invested)
    return {
      month: point.month,
      invested: Number.isFinite(invested) ? invested : 0,
      gain: Number.isFinite(gain) ? gain : 0,
    }
  })

  return (
    <>
      <CustomLegend items={LEGEND_ITEMS} />
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={formatAxisY}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b80' }} />

          {/* Bar oculta — só para que o Legend do Recharts funcione se necessário */}
          <Legend content={() => null} />

          <Bar
            dataKey="invested"
            name="Valor aplicado"
            stackId="wealth"
            fill={COLOR_INVESTED}
            isAnimationActive={false}
            radius={[0, 0, 2, 2]}
          />
          <Bar
            dataKey="gain"
            name="Ganho de Capital"
            stackId="wealth"
            fill={COLOR_GAIN}
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
