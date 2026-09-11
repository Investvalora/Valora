/**
 * Gráfico de linha da evolução patrimonial.
 *
 * Este arquivo é o target de um `React.lazy()` em `PatrimonioPage` —
 * não exporta `default` nomeado para forçar o import dinâmico.
 *
 * `connectNulls={false}` garante que dias sem cotação aparecem como gaps reais
 * e não como interpolação — requisito explícito da spec (Boundaries & Constraints).
 *
 * `isAnimationActive={false}` evita flash visual ao trocar períodos.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { WealthPoint } from '../types'

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | null; payload: WealthPoint }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]
  const value = point?.value

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400">{formatTooltipDate(label ?? '')}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">
        {value !== null && value !== undefined && Number.isFinite(value)
          ? brlFormatter.format(value)
          : '—'}
      </p>
    </div>
  )
}

/** Formata o eixo Y com sufixo k/M para legibilidade. */
function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`
  return `R$${value.toFixed(0)}`
}

interface WealthLineChartProps {
  data: WealthPoint[]
}

export default function WealthLineChart({ data }: WealthLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#334155' }}
          // Mostra ~6 ticks independente do número de pontos
          interval="preserveStartEnd"
        />

        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={72}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Linha de referência em zero para contexto visual */}
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />

        <Line
          type="monotone"
          dataKey="value"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
          // gaps reais: dias com value=null aparecem como quebra na linha
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
