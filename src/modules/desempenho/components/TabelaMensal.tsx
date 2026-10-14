/**
 * TabelaMensal — tabela mês × ano de rentabilidade, agrupada por ano em seções.
 * Cada seção tem um header com o ano, "Anual" e "Acumulado".
 * Recebe MonthlyTableRow[] já calculado pelo usePerformance.
 */
import type { MonthlyTableRow } from '../../performance/utils/performanceCalculations'

type Props = {
  rows: MonthlyTableRow[]
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12']

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  // valores chegam em decimal (0.05 = 5%)
  const pct = v * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

function cellColor(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'text-[#8F8F8F]'
  if (v > 0) return 'text-nf-green'
  if (v < 0) return 'text-nf-pink'
  return 'text-white'
}

export function TabelaMensal({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center">
        <p className="text-[12px] text-[#8F8F8F]">Sem dados suficientes para a tabela mensal</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Tabela desktop (>= md) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="px-3 py-2 text-left font-medium text-[#8F8F8F]">Ano</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1.5 py-2 text-center font-medium text-[#8F8F8F]">
                  {m}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium text-[#8F8F8F]">Anual</th>
              <th className="px-3 py-2 text-right font-medium text-[#8F8F8F]">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <>
                {/* Separador de seção de ano — linha de destaque entre anos */}
                {i > 0 && (
                  <tr key={`sep-${row.year}`} aria-hidden="true">
                    <td
                      colSpan={MONTH_KEYS.length + 3}
                      className="h-px bg-white/[0.06] p-0"
                    />
                  </tr>
                )}
                <tr
                  key={row.year}
                  className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}
                >
                  {/* Ano — destacado com cor branca */}
                  <td className="px-3 py-2.5 font-semibold text-white">{row.year}</td>
                  {MONTH_KEYS.map((key) => {
                    const val = row.months.get(key)
                    return (
                      <td
                        key={key}
                        className={`px-1.5 py-2.5 text-center tabular-nums ${cellColor(val)}`}
                      >
                        {fmtPct(val)}
                      </td>
                    )
                  })}
                  {/* Anual */}
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${cellColor(row.annualReturn)}`}>
                    {fmtPct(row.annualReturn)}
                  </td>
                  {/* Acumulado */}
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${cellColor(row.accumulatedReturn)}`}>
                    {fmtPct(row.accumulatedReturn)}
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cards mobile (< md) — card por ano ── */}
      <div className="block md:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.year}
            className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-4"
          >
            {/* Header: ano + Anual + Acumulado */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-white">{row.year}</span>
              <div className="flex gap-4">
                <span className={`text-[12px] tabular-nums ${cellColor(row.annualReturn)}`}>
                  Anual: {fmtPct(row.annualReturn)}
                </span>
                <span className={`text-[12px] tabular-nums ${cellColor(row.accumulatedReturn)}`}>
                  Acum: {fmtPct(row.accumulatedReturn)}
                </span>
              </div>
            </div>
            {/* Grid 3×4 de meses */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-3">
              {MONTH_KEYS.map((key, idx) => {
                const val = row.months.get(key)
                return (
                  <div key={key}>
                    <span className="text-[10px] text-white/40">{MONTHS[idx]}</span>
                    <br />
                    <span className={`${cellColor(val)} text-[12px] tabular-nums`}>
                      {fmtPct(val)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
