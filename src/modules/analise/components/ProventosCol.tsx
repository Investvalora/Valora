/**
 * ProventosCol — coluna de Proventos da tela Análise.
 * Gráfico de barras + tabela compacta dos últimos proventos.
 */
import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { useDividends } from '../../dividends/hooks/useDividends'
import { buildMonthlyBars } from '../../dividends/utils/dividendCalculations'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useWallets } from '../../portfolio/hooks/useWallets'

// ── formatadores ──────────────────────────────────────────────────────────
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtBRL = (v: number) => brl.format(v)
const fmtBRL0 = (v: number) => brl0.format(v)

const MONTH_ABBR: Record<string, string> = {
  '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez',
}
function fmtMonth(yyyyMM: string) { return MONTH_ABBR[yyyyMM.slice(5, 7)] ?? yyyyMM.slice(5, 7) }
function fmtDate(yyyyMMDD: string) {
  const [, m, d] = yyyyMMDD.split('-')
  return `${d}/${m}`
}

// ── mini gráfico de barras ─────────────────────────────────────────────────
function MiniBarChart({ months, maxBars = 8 }: { months: { month: string; total: number }[]; maxBars?: number }) {
  const visible = months.slice(-maxBars)
  const maxVal = Math.max(...visible.map((b) => b.total), 1)
  const W = 300, H = 120, PAD_B = 16, n = visible.length
  const colW = W / n
  const BW = Math.min(28, colW * 0.55)
  const BLUE = '#7987FF'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Proventos mensais" role="img">
      {visible.map((bar, i) => {
        const bh = Math.max(2, (bar.total / maxVal) * (H - PAD_B - 8))
        const cx = i * colW + colW / 2
        const isLast = i === n - 1
        return (
          <g key={bar.month}>
            <rect x={cx - BW / 2} y={H - PAD_B - bh} width={BW} height={bh} rx={3} fill={BLUE} fillOpacity={isLast ? 1 : 0.5} />
            {isLast && (
              <text x={cx} y={H - PAD_B - bh - 4} textAnchor="middle" fontSize={9} fill={BLUE} fontWeight={500}>
                {fmtBRL0(bar.total)}
              </text>
            )}
            <text x={cx} y={H - 2} textAnchor="middle" fontSize={9} fill="#8F8F8F">{fmtMonth(bar.month)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function ProventosCol() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''
  const { data: divRows = [], isLoading: divLoading } = useDividends('1A')
  const dashboard = useDashboard(walletId)
  const monthlyBars = useMemo(() => buildMonthlyBars(divRows), [divRows])

  // Últimos 8 proventos ordenados por data desc
  const recentRows = useMemo(
    () => [...divRows].sort((a, b) => b.ex_date.localeCompare(a.ex_date)).slice(0, 8),
    [divRows],
  )

  const total12m = dashboard.proventos12mBRL

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#1B1B1B]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white/85">Proventos</h2>
          <p className="text-[11px] text-[#8F8F8F]">Total recebido (12M)</p>
        </div>
        {total12m !== null && (
          <span className="text-[16px] font-semibold text-nf-green">{fmtBRL(total12m)}</span>
        )}
      </div>

      {/* Gráfico */}
      <div className="px-4 pt-4 pb-2">
        {divLoading ? (
          <div className="h-[120px] animate-pulse rounded-lg bg-white/[0.04]" />
        ) : monthlyBars.length > 0 ? (
          <MiniBarChart months={monthlyBars} />
        ) : (
          <div className="flex h-[120px] items-center justify-center">
            <p className="text-[12px] text-[#8F8F8F]">Sem proventos no período</p>
          </div>
        )}
      </div>

      {/* Cabeçalho tabela */}
      <div className="border-t border-white/[0.07] bg-white/[0.03] px-5 py-2">
        <div className="grid grid-cols-3 text-[10px] font-medium text-[#8F8F8F]">
          <span>Ativo</span>
          <span className="text-center">Data</span>
          <span className="text-right">Valor</span>
        </div>
      </div>

      {/* Linhas */}
      <div className="flex-1 overflow-y-auto">
        {divLoading && (
          <div className="flex flex-col gap-1 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-white/[0.04]" />
            ))}
          </div>
        )}

        {!divLoading && recentRows.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-[12px] text-[#8F8F8F]">Sem proventos cadastrados</p>
          </div>
        )}

        {!divLoading && recentRows.map((row, i) => (
          <div
            key={`${row.ticker}-${row.ex_date}-${i}`}
            className={`grid grid-cols-3 items-center px-5 py-2.5 text-[12px] border-t border-white/[0.04] ${
              i % 2 === 1 ? 'bg-white/[0.015]' : ''
            }`}
          >
            <span className="font-medium text-white">{row.ticker}</span>
            <span className="text-center text-[#8F8F8F]">{fmtDate(row.ex_date)}</span>
            <span className="text-right font-medium text-nf-green">{fmtBRL(row.total_value)}</span>
          </div>
        ))}
      </div>

      {/* Link */}
      <div className="border-t border-white/[0.07] px-5 py-3">
        <a
          href="/proventos"
          className="flex items-center gap-1 text-[12px] font-medium text-nf-blue hover:underline"
        >
          Ver histórico de proventos
          <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
