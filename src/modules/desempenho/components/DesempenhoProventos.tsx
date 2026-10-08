/**
 * DesempenhoProventos — sub-rota /desempenho/proventos.
 * Gráfico de barras mensal + tabela (desktop) / cards (mobile) de proventos recebidos com busca e paginação.
 */
import { lazy, Suspense, useState, useMemo } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useDividends, useSyncDividends } from '../../dividends/hooks/useDividends'
import { buildMonthlyBars } from '../../dividends/utils/dividendCalculations'
import { filterAndSort } from '../../dividends/utils/dividendCalculations'
import type { DividendPeriod } from '../../dividends/types'
import type { DividendRow } from '../../dividends/types'

const ProventosChart = lazy(() =>
  import('./ProventosChart').then((m) => ({ default: m.ProventosChart })),
)

function LoadingChart() {
  return (
    <div className="flex h-[160px] items-center justify-center">
      <span className="animate-pulse text-sm text-white/40">Carregando…</span>
    </div>
  )
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(v)
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const PERIOD_OPTIONS: { label: string; value: DividendPeriod }[] = [
  { label: '6 meses', value: '6M' },
  { label: '1 ano', value: '1A' },
  { label: 'Tudo', value: 'Tudo' },
]

const INITIAL_VISIBLE = 6

// ── Card mobile de provento ────────────────────────────────────────────────
function DividendCard({ row }: { row: DividendRow }) {
  return (
    <div className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-4">
      {/* Linha 1: ticker + badge tipo + total */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-bold text-white">{row.ticker}</span>
          <span className="rounded-full border border-nf-blue/40 bg-nf-blue/12 px-2 py-0.5 text-[10px] font-medium text-nf-blue">
            {row.type.toUpperCase()}
          </span>
        </div>
        <span className="shrink-0 text-[14px] font-semibold text-nf-green tabular-nums">
          {fmtBRL(row.total_value)}
        </span>
      </div>

      {/* Linha 2: 3 colunas Data com / Valor/cota / Quantidade */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <span className="block text-[10px] text-white/40">Data com</span>
          <span className="text-[12px] text-white/80 tabular-nums">{fmtDate(row.ex_date)}</span>
        </div>
        <div>
          <span className="block text-[10px] text-white/40">Valor/cota</span>
          <span className="text-[12px] text-white/80 tabular-nums">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            }).format(row.value_per_share)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-white/40">Quantidade</span>
          <span className="text-[12px] text-white/80 tabular-nums">{row.quantity}</span>
        </div>
      </div>
    </div>
  )
}

export function DesempenhoProventos() {
  const [period, setPeriod] = useState<DividendPeriod>('1A')
  const [tickerFilter, setTickerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  const { rows, isLoading, availableTypes } = useDividends(period)
  const syncDividends = useSyncDividends()

  const monthlyBars = useMemo(() => buildMonthlyBars(rows), [rows])

  // KPIs
  const total12m = useMemo(() => rows.reduce((acc, r) => acc + r.total_value, 0), [rows])
  const mediaMensal = useMemo(() => {
    if (monthlyBars.length === 0) return 0
    const total = monthlyBars.reduce((acc, b) => acc + b.total, 0)
    return total / monthlyBars.length
  }, [monthlyBars])
  const maiorMes = useMemo(() => {
    if (monthlyBars.length === 0) return null
    return monthlyBars.reduce((max, b) => (b.total > max.total ? b : max), monthlyBars[0])
  }, [monthlyBars])

  // Tabela filtrada e ordenada
  const filteredRows = useMemo(
    () =>
      filterAndSort(rows, tickerFilter, typeFilter, {
        column: 'ex_date',
        direction: 'desc',
      }),
    [rows, tickerFilter, typeFilter],
  )

  // Reset paginação ao filtrar
  const visibleRows = filteredRows.slice(0, visibleCount)

  function exportCSV() {
    const headers = ['Ticker', 'Tipo', 'Data com', 'Data pagamento', 'Valor/cota', 'Qtd', 'Total']
    const csvRows = filteredRows.map((r) => [
      r.ticker,
      r.type,
      fmtDate(r.ex_date),
      fmtDate(r.payment_date),
      r.value_per_share.toFixed(4),
      r.quantity.toString(),
      r.total_value.toFixed(2),
    ])
    const csv = [headers, ...csvRows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proventos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function fmtMes(yyyyMM: string): string {
    const MONTHS: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    }
    const [y, m] = yyyyMM.split('-')
    return `${MONTHS[m] ?? m}/${y?.slice(2)}`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-white">Proventos</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={syncDividends.isPending}
            onClick={() => syncDividends.mutate()}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncDividends.isPending ? 'animate-spin' : ''}`}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            Atualizar proventos
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-6 py-4 flex items-center gap-0">
        <div className="flex flex-1 flex-col gap-0.5 pr-6">
          <span className="text-[11px] text-white/50">Proventos recebidos</span>
          <span className="text-[18px] font-semibold text-nf-green leading-tight">
            {isLoading ? '—' : fmtBRL(total12m)}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 px-6">
          <span className="text-[11px] text-white/50">Média mensal</span>
          <span className="text-[18px] font-semibold text-white leading-tight">
            {isLoading ? '—' : fmtBRL(mediaMensal)}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 px-6">
          <span className="text-[11px] text-white/50">Maior mês</span>
          <span className="text-[18px] font-semibold text-white leading-tight">
            {isLoading || !maiorMes
              ? '—'
              : `${fmtBRL(maiorMes.total)} · ${fmtMes(maiorMes.month)}`}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 pl-6">
          <span className="text-[11px] text-white/50">Período</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as DividendPeriod)}
            className="mt-1 rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-2 py-1 text-[12px] text-white focus:outline-none"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Gráfico barras ── */}
      <PanelCard>
        <h3 className="mb-4 text-[14px] font-semibold text-white">Proventos por mês</h3>
        {isLoading ? (
          <LoadingChart />
        ) : (
          <Suspense fallback={<LoadingChart />}>
            <ProventosChart bars={monthlyBars} maxBars={12} />
          </Suspense>
        )}
      </PanelCard>

      {/* ── Proventos recebidos ── */}
      <PanelCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-white">
            Proventos recebidos
            {!isLoading && (
              <span className="ml-2 text-[12px] font-normal text-white/40">
                ({filteredRows.length})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {/* Busca por ticker */}
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Buscar ticker…"
                value={tickerFilter}
                onChange={(e) => {
                  setTickerFilter(e.target.value)
                  setVisibleCount(INITIAL_VISIBLE)
                }}
                className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] pl-8 pr-3 py-1.5 text-[12px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 w-[150px]"
              />
            </div>
            {/* Dropdown tipo */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setVisibleCount(INITIAL_VISIBLE)
              }}
              className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-1.5 text-[12px] text-white focus:outline-none"
            >
              <option value="">Todos os tipos</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-white/40">
            {rows.length === 0
              ? 'Nenhum provento no período selecionado.'
              : 'Nenhum resultado para o filtro aplicado.'}
          </p>
        ) : (
          <>
            {/* ── Cards mobile (< md) ── */}
            <div className="block md:hidden">
              <div className="flex flex-col gap-3">
                {visibleRows.map((row, i) => (
                  <DividendCard key={`${row.ticker}-${row.ex_date}-${i}`} row={row} />
                ))}
              </div>
              {/* Paginação */}
              {filteredRows.length > INITIAL_VISIBLE && (
                <div className="mt-4 flex items-center justify-center">
                  {visibleCount < filteredRows.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((v) => v + INITIAL_VISIBLE)}
                      className="text-[12px] text-white/50 hover:text-white transition-colors"
                    >
                      Mostrando {visibleRows.length} de {filteredRows.length} · Ver mais
                    </button>
                  ) : (
                    <span className="text-[12px] text-white/30">
                      Mostrando {filteredRows.length} de {filteredRows.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Tabela desktop (>= md) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-white/[0.04]">
                    <th className="px-3 py-2.5 text-left font-medium text-white/50">Ticker</th>
                    <th className="px-3 py-2.5 text-left font-medium text-white/50">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium text-white/50">Data com</th>
                    <th className="px-3 py-2.5 text-right font-medium text-white/50">
                      Data pagamento
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-white/50">Valor/cota</th>
                    <th className="px-3 py-2.5 text-right font-medium text-white/50">Qtd</th>
                    <th className="px-3 py-2.5 text-right font-medium text-white/50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr
                      key={`${row.ticker}-${row.ex_date}-${i}`}
                      className={`border-t border-white/[0.04] ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-white">{row.ticker}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full border border-nf-blue/40 bg-nf-blue/12 px-2 py-0.5 text-[10px] font-medium text-nf-blue">
                          {row.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">
                        {fmtDate(row.ex_date)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">
                        {fmtDate(row.payment_date)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        }).format(row.value_per_share)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-nf-green">
                        {fmtBRL(row.total_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PanelCard>
    </div>
  )
}
