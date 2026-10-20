import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  type TooltipProps,
} from 'recharts'
import type { PerformanceSeries } from '../types'

interface PerformanceLineChartProps {
  series: PerformanceSeries[]
}

/**
 * Converte `YYYY-MM-DD` em `MMM/YY` em pt-BR para o eixo X.
 * Retorna o valor bruto se o formato for inesperado.
 */
function formatAxisDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!match) return String(value)
  const [, year, month] = match
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

/** Formata valor normalizado como variação percentual: `+12,34%`. */
function formatNormalized(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  const pct = (Number(value) / 100 - 1) * 100
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(pct) + '%'
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      role="tooltip"
      className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm shadow-lg min-w-[160px]"
    >
      <p className="text-gray-400 mb-2 text-xs">{formatAxisDate(String(label))}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-gray-300">{entry.name}</span>
          </span>
          <span className="font-semibold text-white tabular-nums">
            {formatNormalized(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Gráfico de linhas comparativo de rentabilidade.
 *
 * Este arquivo é o alvo do `React.lazy` na `RentabilidadePage`.
 * `isAnimationActive={false}` previne falhas em jsdom nos testes.
 *
 * Todas as séries são normalizadas a 100 no início do período;
 * o tooltip exibe a variação percentual acumulada de cada uma.
 */
export default function PerformanceLineChart({ series }: PerformanceLineChartProps) {
  // Unifica todas as séries em um único array de pontos para o Recharts,
  // indexado por data. Cada objeto: { date, [label]: normalized, ... }
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.date))),
  ).sort()

  if (allDates.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-[280px] text-gray-500 text-sm"
        aria-label="Nenhum dado para exibir no gráfico"
      >
        Sem dados no período
      </div>
    )
  }

  // Constrói mapa de pontos por série
  const pointsByLabel = new Map<string, Map<string, number | null>>()
  for (const s of series) {
    const m = new Map<string, number | null>()
    for (const p of s.points) m.set(p.date, p.normalized ?? null)
    pointsByLabel.set(s.label, m)
  }

  const data = allDates.map((date) => {
    const entry: Record<string, string | number | null> = { date }
    for (const s of series) {
      entry[s.label] = pointsByLabel.get(s.label)?.get(date) ?? null
    }
    return entry
  })

  // Seleciona ~8 ticks igualmente espaçados para não poluir o eixo X
  const tickInterval = Math.max(1, Math.floor(allDates.length / 8))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tickFormatter={(v: number) =>
            new Intl.NumberFormat('pt-BR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
              signDisplay: 'exceptZero',
            }).format(v - 100) + '%'
          }
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '8px' }}
          formatter={(value) => (
            <span style={{ color: '#d1d5db' }}>{value}</span>
          )}
        />
        {series.map((s) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
