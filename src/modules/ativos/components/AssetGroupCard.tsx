/**
 * AssetGroupCard — card colapsável de grupo de ativos para mobile.
 * Exibido em AtivosPosicoes no breakpoint < 768px.
 */
import { ChevronDown } from 'lucide-react'
import type { PositionRow, AssetType } from '../../portfolio/types'
import { fmtMoney, fmtPct } from '../utils/fmt'

/** Rótulo curto por tipo de ativo (mesmo mapa de AtivosLancamentos). */
const ASSET_TYPE_SHORT: Partial<Record<AssetType, string>> = {
  stock_br:     'Ações BR',
  fii:          'FIIs',
  bdr:          'BDRs',
  stock_us:     'Stocks',
  etf_us:       'ETF US',
  reit:         'REITs',
  crypto:       'Criptos',
  fixed_income: 'Renda Fixa',
  etf_br:       'ETF BR',
}

// ── Ícone-letra colorido ─────────────────────────────────────────────────
function ClassIcon({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] text-[13px] font-bold"
      style={{ backgroundColor: `${color}33`, color }}
      aria-hidden="true"
    >
      {label[0]}
    </span>
  )
}

export interface AssetGroupCardProps {
  type: AssetType | 'unknown'
  label: string
  color: string
  totalBRL: number | null
  variationPct: number | null
  portfolioPct: number | null
  rows: PositionRow[]
  isExpanded: boolean
  onToggle: () => void
}

export function AssetGroupCard({
  label,
  color,
  totalBRL,
  variationPct,
  portfolioPct,
  rows,
  isExpanded,
  onToggle,
}: AssetGroupCardProps) {
  const positiveVariation = variationPct !== null && variationPct >= 0

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1B1B1B]">
      {/* ── Header ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
      >
        <ClassIcon label={label} color={color} />

        {/* Nome da classe */}
        <span className="flex-1 text-left text-[13px] font-semibold text-white">{label}</span>

        {/* Valor total */}
        <span className="text-[13px] font-semibold text-white tabular-nums">
          {fmtMoney(totalBRL)}
        </span>

        {/* Variação */}
        {variationPct !== null && (
          <span
            className={`min-w-[52px] text-right text-[12px] font-medium tabular-nums ${
              positiveVariation ? 'text-nf-green' : 'text-nf-pink'
            }`}
          >
            {fmtPct(variationPct)}
          </span>
        )}

        {/* % carteira */}
        {portfolioPct !== null && (
          <span className="min-w-[38px] text-right text-[11px] text-white/40 tabular-nums">
            {portfolioPct.toFixed(1)}%
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {/* ── Corpo expandido ── */}
      {isExpanded && rows.length > 0 && (
        <div className="border-t border-white/[0.06]">
          {rows.map((row, i) => {
            const assetType = row.type
            const shortLabel = assetType ? (ASSET_TYPE_SHORT[assetType] ?? label) : label

            return (
              <div
                key={row.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < rows.length - 1 ? 'border-b border-white/[0.04]' : ''
                }`}
              >
                {/* Ticker + nome abreviado */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-white">{row.ticker}</span>
                  <span className="truncate text-[11px] text-white/40">
                    {row.name ?? shortLabel}
                  </span>
                </div>

                {/* Valor atual */}
                <span className="text-[13px] font-medium text-white tabular-nums">
                  {fmtMoney(row.marketValueBRL)}
                </span>

                {/* Variação % */}
                {row.changePercent !== null ? (
                  <span
                    className={`min-w-[50px] text-right text-[12px] tabular-nums ${
                      row.changePercent >= 0 ? 'text-nf-green' : 'text-nf-pink'
                    }`}
                  >
                    {fmtPct(row.changePercent)}
                  </span>
                ) : (
                  <span className="min-w-[50px] text-right text-[12px] text-white/30">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
