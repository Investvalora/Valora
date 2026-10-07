/**
 * DesempenhoRentabilidade — sub-rota /desempenho/rentabilidade.
 * Gráfico de linha comparativo, tabela mensal e tabela por ativo.
 */
import { lazy, Suspense, useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { PanelCard } from '../../../shared/components/PanelCard'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { TabelaMensal } from './TabelaMensal'
import { usePositions } from '../../portfolio/hooks/usePositions'
import type { PerformancePeriod } from '../../performance/types'

const PerformanceLineChart = lazy(
  () => import('../../performance/components/PerformanceLineChart'),
)

function LoadingChart() {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <span className="animate-pulse text-sm text-white/40">Carregando…</span>
    </div>
  )
}

const PERIOD_OPTIONS: { label: string; value: PerformancePeriod }[] = [
  { label: '1 mês', value: '1M' },
  { label: '3 meses', value: '3M' },
  { label: '6 meses', value: '6M' },
  { label: '1 ano', value: '1A' },
  { label: 'Desde o início', value: 'Tudo' },
]

const ASSET_CLASS_LABELS: Record<string, string> = {
  stock_br: 'Ação',
  fii: 'FII',
  bdr: 'BDR',
  stock_us: 'Stock US',
  etf_us: 'ETF US',
  reit: 'REIT',
  crypto: 'Cripto',
  fixed_income: 'Renda Fixa',
  etf_br: 'ETF BR',
}

const CLASS_COLORS: Record<string, string> = {
  stock_br: '#3B82F6',
  fii: '#22c55e',
  bdr: '#f97316',
  stock_us: '#a855f7',
  etf_us: '#ec4899',
  reit: '#eab308',
  crypto: '#06b6d4',
  fixed_income: '#64748b',
  etf_br: '#84cc16',
}

function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(v)
}

function getInitial(name: string | null, ticker: string): string {
  if (name) return name.charAt(0).toUpperCase()
  return ticker.charAt(0).toUpperCase()
}

export function DesempenhoRentabilidade() {
  const [period, setPeriod] = useState<PerformancePeriod>('Tudo')
  const [typeFilter, setTypeFilter] = useState('Todos os tipos')

  const { portfolioSeries, benchmarkSeries, summary, assetRows, monthlyTableData, isLoading } =
    usePerformance(period)

  // Positions para obter o type do ativo (classe)
  const { data: positions = [] } = usePositions()
  const tickerTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of positions) {
      if (p.asset?.type) m.set(p.ticker, p.asset.type)
    }
    return m
  }, [positions])

  // Filtra assetRows pelo tipo selecionado
  const filteredAssetRows = useMemo(() => {
    if (typeFilter === 'Todos os tipos') return assetRows
    return assetRows.filter((r) => {
      const t = tickerTypeMap.get(r.ticker)
      return t != null && ASSET_CLASS_LABELS[t] === typeFilter
    })
  }, [assetRows, typeFilter, tickerTypeMap])

  // Tipos disponíveis para o dropdown
  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    for (const r of assetRows) {
      const t = tickerTypeMap.get(r.ticker)
      if (t && ASSET_CLASS_LABELS[t]) types.add(ASSET_CLASS_LABELS[t])
    }
    return ['Todos os tipos', ...Array.from(types).sort()]
  }, [assetRows, tickerTypeMap])

  // KPIs
  const rentPct = summary.portfolioReturnPct
  const rentFormatted = rentPct != null ? fmtPct(rentPct * 100) : '—'
  const rentPositive = rentPct != null ? rentPct >= 0 : null
  const rentColor =
    rentPositive === null ? 'text-white' : rentPositive ? 'text-nf-green' : 'text-nf-pink'

  // Exportar CSV da tabela por ativo
  function exportAssetCSV() {
    const headers = ['Ticker', 'Nome', 'Classe', 'Rentabilidade (%)', 'vs CDI (p.p.)']
    const rows = filteredAssetRows.map((r) => {
      const t = tickerTypeMap.get(r.ticker)
      const classeLabel = t ? (ASSET_CLASS_LABELS[t] ?? t) : '—'
      const vscdipp =
        r.totalReturnPct != null && summary.cdiReturnPct != null
          ? ((r.totalReturnPct - summary.cdiReturnPct * 100) / 100).toFixed(2)
          : '—'
      return [r.ticker, r.name ?? '', classeLabel, r.totalReturnPct?.toFixed(2) ?? '—', vscdipp]
    })
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rentabilidade-por-ativo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-white">Rentabilidade</h2>
        <button
          type="button"
          onClick={exportAssetCSV}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      {/* ── KPI bar ── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-6 py-4 flex items-center gap-0">
        <div className="flex flex-1 flex-col gap-0.5 pr-6">
          <span className="text-[11px] text-white/50">Rentabilidade total</span>
          <span className={`text-[18px] font-semibold leading-tight ${rentColor}`}>
            {rentFormatted}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 px-6">
          <span className="text-[11px] text-white/50">vs CDI (p.p.)</span>
          <span
            className={`text-[18px] font-semibold leading-tight ${
              summary.vscdipPp == null
                ? 'text-white'
                : summary.vscdipPp >= 0
                  ? 'text-nf-green'
                  : 'text-nf-pink'
            }`}
          >
            {summary.vscdipPp != null ? fmtPct(summary.vscdipPp) : '—'}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 px-6">
          <span className="text-[11px] text-white/50">IBOV</span>
          <span className="text-[18px] font-semibold text-white leading-tight">
            {summary.ibovReturnPct != null ? fmtPct(summary.ibovReturnPct * 100) : '—'}
          </span>
        </div>
        <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-0.5 pl-6">
          <span className="text-[11px] text-white/50">CDI</span>
          <span className="text-[18px] font-semibold text-white leading-tight">
            {summary.cdiReturnPct != null ? fmtPct(summary.cdiReturnPct * 100) : '—'}
          </span>
        </div>
      </div>

      {/* ── Gráfico ── */}
      <PanelCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-white">
            Rentabilidade comparada com índices
          </h3>
          <div className="flex items-center gap-2">
            {/* Legenda inline */}
            <div className="flex items-center gap-3 mr-2">
              <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="inline-block h-2 w-6 rounded-sm bg-[#3b82f6]" />
                Carteira
              </span>
              {benchmarkSeries.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span
                    className="inline-block h-2 w-6 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
            {/* Dropdown período */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PerformancePeriod)}
              className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-1.5 text-[12px] text-white focus:outline-none"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {/* Dropdown tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-1.5 text-[12px] text-white focus:outline-none"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isLoading ? (
          <LoadingChart />
        ) : (
          <Suspense fallback={<LoadingChart />}>
            <PerformanceLineChart series={[portfolioSeries, ...benchmarkSeries]} />
          </Suspense>
        )}
      </PanelCard>

      {/* ── Tabela mensal ── */}
      <PanelCard>
        <h3 className="mb-4 text-[14px] font-semibold text-white">Rentabilidade mensal</h3>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <span className="animate-pulse text-sm text-white/40">Carregando…</span>
          </div>
        ) : (
          <TabelaMensal rows={monthlyTableData} />
        )}
      </PanelCard>

      {/* ── Tabela por ativo ── */}
      <PanelCard>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">
            Rentabilidade por ativo
            {filteredAssetRows.length > 0 && (
              <span className="ml-2 text-[12px] font-normal text-white/40">
                ({filteredAssetRows.length})
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={exportAssetCSV}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : filteredAssetRows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-white/40">
            Nenhum ativo encontrado para o período e filtro selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Ativo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Classe</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50">Valor atual</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50">
                    Rentabilidade
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50">vs CDI</th>
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Desempenho</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssetRows.map((row, i) => {
                  const assetType = tickerTypeMap.get(row.ticker)
                  const classeLabel = assetType ? (ASSET_CLASS_LABELS[assetType] ?? assetType) : '—'
                  const classeColor = assetType ? (CLASS_COLORS[assetType] ?? '#6b7280') : '#6b7280'

                  // vs CDI em pontos percentuais
                  const vscdipp =
                    row.totalReturnPct != null && summary.cdiReturnPct != null
                      ? row.totalReturnPct - summary.cdiReturnPct * 100
                      : null

                  const rentPositive =
                    row.totalReturnPct != null ? row.totalReturnPct >= 0 : null
                  const rentCls =
                    rentPositive === null
                      ? 'text-white'
                      : rentPositive
                        ? 'text-nf-green'
                        : 'text-nf-pink'

                  // Posição para buscar valor de mercado
                  const position = positions.find((p) => p.ticker === row.ticker)
                  const qty = position?.quantity ?? 0
                  const avgPrice = position?.average_price ?? 0

                  // Barra de desempenho — escala relativa ao máximo absoluto
                  const maxRent = Math.max(
                    ...filteredAssetRows
                      .map((r) => Math.abs(r.totalReturnPct ?? 0))
                      .filter((v) => v > 0),
                    1,
                  )
                  const barWidth =
                    row.totalReturnPct != null
                      ? Math.round((Math.abs(row.totalReturnPct) / maxRent) * 100)
                      : 0
                  const barColor = rentPositive ? '#4ADE80' : '#F472B6'

                  return (
                    <tr
                      key={row.ticker}
                      className={`border-t border-white/[0.04] ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Avatar + Ticker/Nome */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: `${classeColor}33` }}
                            aria-hidden="true"
                          >
                            {getInitial(row.name, row.ticker)}
                          </span>
                          <div>
                            <span className="font-semibold text-white">{row.ticker}</span>
                            {row.name && (
                              <p className="text-[10px] text-white/40 truncate max-w-[140px]">
                                {row.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Classe badge */}
                      <td className="px-3 py-2.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${classeColor}22`,
                            color: classeColor,
                          }}
                        >
                          {classeLabel}
                        </span>
                      </td>
                      {/* Valor atual */}
                      <td className="px-3 py-2.5 text-right tabular-nums text-white">
                        {qty > 0 && avgPrice > 0
                          ? fmtBRL(qty * avgPrice)
                          : '—'}
                      </td>
                      {/* Rentabilidade */}
                      <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${rentCls}`}>
                        {row.totalReturnPct != null ? fmtPct(row.totalReturnPct) : '—'}
                      </td>
                      {/* vs CDI */}
                      <td
                        className={`px-3 py-2.5 text-right tabular-nums ${
                          vscdipp == null
                            ? 'text-white/50'
                            : vscdipp >= 0
                              ? 'text-nf-green'
                              : 'text-nf-pink'
                        }`}
                      >
                        {vscdipp != null ? `${vscdipp >= 0 ? '+' : ''}${vscdipp.toFixed(1)}pp` : '—'}
                      </td>
                      {/* Barra de desempenho */}
                      <td className="px-3 py-2.5 min-w-[100px]">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  )
}
