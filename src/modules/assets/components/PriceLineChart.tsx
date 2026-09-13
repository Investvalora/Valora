/**
 * Gráfico de linha do histórico de preços de um ativo.
 *
 * Target de `React.lazy()` em `AtivoDetailPage` — exportação default
 * obrigatória para que o import dinâmico funcione corretamente.
 *
 * Baseado em `WealthLineChart` (mesma estrutura Recharts, mesmos padrões
 * de acessibilidade), mas com eixo Y formatado pelo preço do ativo
 * (sem prefixo R$ no eixo, sem ReferenceLine em zero).
 */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { PricePoint } from '../types'

/** Formata data `YYYY-MM-DD` como `DD/MM` para o eixo X. */
function formatAxisDate(value: string): string {
  if (typeof value !== 'string' || value.length < 10) return value
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}

/** Formata data `YYYY-MM-DD` como `DD/MM/YYYY` para o tooltip. */
function formatTooltipDate(value: string): string {
  if (typeof value !== 'string' || value.length < 10) return value
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Formata o eixo Y: preço sem casas decimais quando >= 100, senão 2 casas. */
function formatYAxis(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value >= 100 ? value.toFixed(0) : value.toFixed(2)
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | null }>
  label?: string
  currency?: string
}

function CustomTooltip({ active, payload, label, currency = 'BRL' }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const value = payload[0]?.value
  const prefix = currency === 'USD' ? 'US$ ' : 'R$ '

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400">{formatTooltipDate(label ?? '')}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">
        {value !== null && value !== undefined && Number.isFinite(value)
          ? `${prefix}${brlFormatter.format(value)}`
          : '—'}
      </p>
    </div>
  )
}

interface PriceLineChartProps {
  data: PricePoint[]
  currency?: string
}

export default function PriceLineChart({ data, currency = 'BRL' }: PriceLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#334155' }}
          interval="preserveStartEnd"
        />

        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          domain={['auto', 'auto']}
        />

        <Tooltip content={<CustomTooltip currency={currency} />} />

        <Line
          type="monotone"
          dataKey="close"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
