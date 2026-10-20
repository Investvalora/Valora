import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  type TooltipProps,
} from 'recharts'
import { assetClassColor, assetClassLabel } from '../../portfolio/composition'
import type { AssetType } from '../../portfolio/types'
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

  return (
    <div
      role="tooltip"
      className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm shadow-lg"
    >
      <p className="text-gray-400 mb-1">{formatMonth(String(label))}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-4 text-gray-300">
          <span>{entry.name}</span>
          <span className="font-semibold text-white">{brlFormatter.format(Number(entry.value))}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-dark-border pt-1 font-semibold text-white">
        Total: {brlFormatter.format(payload.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0))}
      </p>
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

  const assetTypes = [...new Set(data.flatMap((bar) => Object.keys(bar.byAssetType ?? {})))].sort()
  const chartData = data.map((bar) => ({ ...bar, ...(bar.byAssetType ?? {}) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
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
        <Legend
          formatter={(type) => (
            <span style={{ color: '#d1d5db' }}>
              {type === 'unknown' ? 'Outros' : assetClassLabel(type as AssetType)}
            </span>
          )}
          wrapperStyle={{ fontSize: '11px' }}
        />
        {assetTypes.map((type, index) => (
          <Bar
            key={type}
            dataKey={type}
            name={type === 'unknown' ? 'Outros' : assetClassLabel(type as AssetType)}
            stackId="assets"
            fill={type === 'unknown' ? '#94a3b8' : assetClassColor(type as AssetType)}
            radius={index === assetTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
