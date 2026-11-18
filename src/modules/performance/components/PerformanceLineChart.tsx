import { useLayoutEffect, useRef } from 'react'
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
import { comparisonChart } from '../utils/comparisonChart'
import { useChartMorph } from '../../../shared/hooks/useChartMorph'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { blendValue, sampleCurve } from '../../../shared/utils/chartMorph'

interface PerformanceLineChartProps {
  series: PerformanceSeries[]
  animate?: boolean
  scope?: string
  scrollOnMobile?: boolean
}

const MOBILE_CHART_HEIGHT = 252
const MOBILE_CHART_TOP = 10
const MOBILE_DATE_AXIS_HEIGHT = 26
const axisPercent = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

function formatAxisPercent(value: number) {
  return axisPercent.format(value - 100) + '%'
}

function mobileAxisTicks([min, max]: [number, number]) {
  const roughStep = (max - min) / 5
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const step = Math.max(1, ([1, 2, 5, 10].find((factor) => factor * magnitude >= roughStep) ?? 10) * magnitude)
  const first = 100 + Math.ceil((min - 100) / step) * step
  return Array.from({ length: Math.floor((max - first) / step) + 1 }, (_, index) => first + index * step)
}

function canMorphPerformance(from: PerformanceSeries[], to: PerformanceSeries[]) {
  return (from.find((item) => item.label === 'Carteira')?.points.length ?? 0) > 1 &&
    (to.find((item) => item.label === 'Carteira')?.points.length ?? 0) > 1
}

function morphPerformance(from: PerformanceSeries[], to: PerformanceSeries[], progress: number): PerformanceSeries[] {
  const previous = new Map(from.map((item) => [item.label, item.points]))
  return to.map((item) => ({
    ...item,
    points: item.points.map((point, index) => ({
      ...point,
      normalized: blendValue(
        sampleCurve(previous.get(item.label) ?? [], index / Math.max(1, item.points.length - 1), (entry) => entry.normalized),
        point.normalized,
        progress,
      ) as number,
    })),
  }))
}

/**
 * Converte `YYYY-MM-DD` em `MMM/YY` em pt-BR para o eixo X.
 * Retorna o valor bruto se o formato for inesperado.
 */
function formatAxisDate(value: string | number): string {
  if (typeof value === 'number') value = new Date(value).toISOString().slice(0, 10)
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
  const tooltipRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = tooltipRef.current
    if (!element) return
    element.style.transform = ''
    const rect = element.getBoundingClientRect()
    const region = element.closest('[aria-label="Histórico de rentabilidade comparada"]')?.getBoundingClientRect()
    const left = Math.max(8, region?.left ?? 8)
    const right = Math.min(window.innerWidth - 8, region?.right ?? window.innerWidth - 8)
    const shift = Math.max(left - rect.left, Math.min(0, right - rect.right))
    element.style.transform = `translateX(${shift}px)`
  })
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="min-w-[160px] rounded-xl border border-white/15 bg-[#242424]/85 bg-gradient-to-b from-white/[0.09] to-transparent px-3 py-2 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm"
    >
      <p className="mb-2 text-xs text-white/65">{new Date(typeof label === 'number' ? label : `${label}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
      {payload.map((entry, idx) => (
        <div key={`${entry.name}-${entry.dataKey || idx}`} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-white/85">{entry.name}</span>
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
 * A animação é opcional e respeita a preferência de movimento reduzido.
 *
 * Todas as séries são normalizadas a 100 no início do período;
 * o tooltip exibe a variação percentual acumulada de cada uma.
 */
export default function PerformanceLineChart({
  series,
  animate = false,
  scope = 'default',
  scrollOnMobile = false,
}: PerformanceLineChartProps) {
  const isMobile = useIsMobile()
  const scrollable = scrollOnMobile && isMobile
  const morphEnabled = animate && typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animatedSeries = useChartMorph(scope, series, morphPerformance, canMorphPerformance, morphEnabled)
  // Unifica todas as séries em um único array de pontos para o Recharts,
  // indexado por data. Cada objeto: { date, [label]: normalized, ... }
  const chart = comparisonChart(animatedSeries)
  const allDates = chart.dates

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

  const timestamp = (date: string) => Date.parse(`${date}T12:00:00Z`)
  const tickInterval = Math.max(1, Math.floor(allDates.length / 8))
  const ticks = allDates.filter((_, index) => index % tickInterval === 0).map(timestamp)
  const shortPeriod = timestamp(allDates[allDates.length - 1]) - timestamp(allDates[0]) < 120 * 86400000
  const unavailable = chart.series.filter((item) => item.label !== 'Carteira' && !item.points.some((point) => point.normalized !== null && Number.isFinite(point.normalized))).map((item) => item.label)
  const [min, max] = chart.domain
  const mobileTicks = scrollable ? mobileAxisTicks(chart.domain).map((value) => ({
    value,
    top: MOBILE_CHART_TOP + (max - value) / (max - min) *
      (MOBILE_CHART_HEIGHT - MOBILE_CHART_TOP - MOBILE_DATE_AXIS_HEIGHT),
  })) : []
  const chartContent = (
    <ResponsiveContainer width="100%" height={scrollable ? MOBILE_CHART_HEIGHT : 280}>
      <LineChart data={chart.data} margin={scrollable
        ? { top: MOBILE_CHART_TOP, right: 24, left: 20, bottom: 0 }
        : { top: 8, right: 8, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#2a2a3e"
          vertical={false}
          horizontalPoints={scrollable ? mobileTicks.map(({ top }) => top) : undefined}
        />
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={[timestamp(allDates[0]), timestamp(allDates[allDates.length - 1])]}
          ticks={ticks}
          tickFormatter={(value: number) => shortPeriod ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : formatAxisDate(value)}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          height={scrollable ? MOBILE_DATE_AXIS_HEIGHT : 30}
        />
        <YAxis
          domain={chart.domain}
          allowDataOverflow={scrollable}
          tickFormatter={formatAxisPercent}
          tick={scrollable ? false : { fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={scrollable ? 0 : 56}
        />
        <Tooltip content={<CustomTooltip />} />
        {!scrollable && (
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '8px' }}
            formatter={(value) => (
              <span style={{ color: '#d1d5db' }}>{value}</span>
            )}
          />
        )}
        {chart.series.map((s) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={s.points.filter((point) => point.normalized !== null).length === 1 ? { r: 3 } : false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )

  return (
    <div>
      <p className="mb-3 text-xs text-white/50">
        Período com dados: {allDates[0].split('-').reverse().join('/')} a {allDates[allDates.length - 1].split('-').reverse().join('/')}
        {unavailable.length > 0 ? `. ${unavailable.join(', ')} sem dados nesse intervalo; comparação indisponível.` : ''}
      </p>
      {scrollable ? (
        <>
          <div className="-mx-2 flex min-w-0">
            <div
              aria-hidden="true"
              className="relative w-11 shrink-0 text-right text-[11px] tabular-nums text-gray-400"
            >
              {mobileTicks.map(({ value, top }) => (
                <span
                  key={value}
                  className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
                  style={{ top }}
                >
                  {formatAxisPercent(value)}
                </span>
              ))}
            </div>
            <div
              className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
              role="region"
              aria-label="Histórico de rentabilidade comparada"
              tabIndex={0}
            >
              <div style={{ minWidth: Math.max(1, ticks.length) * 62 + 20 }}>
                {chartContent}
              </div>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-300">
            {chart.series.map(({ label, color }) => (
              <li key={label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </li>
            ))}
          </ul>
        </>
      ) : chartContent}
    </div>
  )
}
