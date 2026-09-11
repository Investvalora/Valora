import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts'
import type { MonthlyBar } from '../types'

interface DividendsBarChartProps {
  data: MonthlyBar[]
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rótulo do eixo X: converte `YYYY-MM` em `MMM/YY` em pt-BR. */
function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month

  const [, year, monthNum] = match
  const date = new Date(Number(year), Number(monthNum) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  const value = payload[0]?.value ?? 0

  return (
    <div
      role="tooltip"
      className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm shadow-lg"
    >
      <p className="text-gray-400 mb-1">{formatMonth(String(label))}</p>
      <p className="text-white font-semibold">{brlFormatter.format(Number(value))}</p>
    </div>
  )
}

/**
 * Gráfico de barras mensais de proventos.
 *
 * Este arquivo é o alvo do `React.lazy` na `ProventosPage`.
 * `isAnimationActive={false}` previne falhas em jsdom nos testes.
 */
export default function DividendsBarChart({ data }: DividendsBarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 text-gray-500 text-sm"
        aria-label="Nenhum dado para exibir no gráfico"
      >
        Nenhum provento no período
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(v)
          }
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
