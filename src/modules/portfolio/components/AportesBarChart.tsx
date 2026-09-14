/**
 * Gráfico de barras mensais de consolidação de aportes.
 *
 * - Barras verdes para compras (positivo)
 * - Barras rosas para vendas (negativo — exibidas abaixo do eixo)
 *
 * Target de React.lazy em LancamentosPage.
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
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyAportePoint } from '../hooks/useTransactions'

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

/** `YYYY-MM` → `MM/YY` */
function formatMonth(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return yearMonth
  const [year, month] = yearMonth.split('-')
  return `${month}/${year.slice(2)}`
}

// ─── tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const compras = payload.find((p) => p.name === 'Compras')
  const vendas = payload.find((p) => p.name === 'Vendas')
  const saldo = (compras?.value ?? 0) - (vendas?.value ?? 0)

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface px-4 py-3 shadow-xl text-xs leading-relaxed">
      <p className="font-semibold text-white mb-1.5">{formatMonth(label ?? '')}</p>
      {compras && compras.value > 0 && (
        <p className="text-gray-300">
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: compras.fill }} />
          Compras: <span className="text-white">{brlFull.format(compras.value)}</span>
        </p>
      )}
      {vendas && vendas.value > 0 && (
        <p className="text-gray-300">
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: vendas.fill }} />
          Vendas: <span className="text-white">{brlFull.format(vendas.value)}</span>
        </p>
      )}
      {(compras?.value || vendas?.value) && (
        <p className="mt-1 pt-1 border-t border-dark-border font-semibold text-white">
          Saldo: {brlFull.format(saldo)}
        </p>
      )}
    </div>
  )
}

// ─── legenda customizada ──────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-gray-400 mb-2">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-[#16a34a]" />
        Compras
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-[#f472b6]" />
        Vendas
      </span>
    </div>
  )
}

// ─── props e componente ───────────────────────────────────────────────────────

interface AportesBarChartProps {
  data: MonthlyAportePoint[]
}

const COLOR_COMPRAS = '#16a34a'
const COLOR_VENDAS = '#f472b6'

export default function AportesBarChart({ data }: AportesBarChartProps) {
  // Transforma para o formato do Recharts:
  // vendas viram negativo para aparecerem abaixo do eixo zero
  const chartData = data.map((p) => ({
    month: p.month,
    compras: p.compras,
    vendas: p.vendas > 0 ? -p.vendas : 0,
  }))

  return (
    <>
      <CustomLegend />
      <ResponsiveContainer width="100%" height={320}>
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

          {/* Linha de referência em zero */}
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b60' }} />

          {/* Oculta o Legend padrão — usamos o CustomLegend acima */}
          <Legend content={() => null} />

          <Bar
            dataKey="compras"
            name="Compras"
            fill={COLOR_COMPRAS}
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="vendas"
            name="Vendas"
            fill={COLOR_VENDAS}
            isAnimationActive={false}
            radius={[0, 0, 2, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
