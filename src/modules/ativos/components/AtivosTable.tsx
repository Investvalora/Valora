/**
 * AtivosTable
 * Tabela de posições no novo estilo visual.
 * Colunas: Ativo | Classe | Qtd | Preço médio | Posição | Lucro% | DY
 */
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { PositionRow, AssetCurrency } from '../../portfolio/types'
import { assetClassLabel, assetClassColor } from '../../portfolio/composition'
import { fmtMoney, fmtPct, fmtQty } from '../utils/fmt'

type Props = {
  rows: PositionRow[]
  isLoading?: boolean
}

// ── célula de variação colorida ────────────────────────────────────────────
function ChangeCell({ value, currency }: { value: number | null; currency: AssetCurrency | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-[#8F8F8F]">—</span>
  }
  const positive = value >= 0
  return (
    <span className={`flex items-center justify-end gap-1 ${positive ? 'text-nf-green' : 'text-nf-pink'}`}>
      {positive
        ? <TrendingUp className="h-[11px] w-[11px] shrink-0" strokeWidth={2} aria-hidden="true" />
        : <TrendingDown className="h-[11px] w-[11px] shrink-0" strokeWidth={2} aria-hidden="true" />
      }
      {fmtPct(value)}
    </span>
  )
}

// ── header de coluna ordenável ─────────────────────────────────────────────
function Th({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`
        px-2 py-2.5 text-[11px] font-medium text-[#8F8F8F]
        ${align === 'right' ? 'text-right' : 'text-left'}
        ${className}
      `}
    >
      {children}
    </th>
  )
}

// ── esqueleto de loading ───────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-t border-white/[0.04]">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-2 py-3">
          <div className="h-3.5 animate-pulse rounded bg-white/[0.06]" />
        </td>
      ))}
    </tr>
  )
}

// ── componente principal ───────────────────────────────────────────────────
export function AtivosTable({ rows, isLoading = false }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="bg-white/[0.04]">
            <Th className="pl-4">Ativo</Th>
            <Th>Classe</Th>
            <Th align="right">Qtd</Th>
            <Th align="right">Preço médio</Th>
            <Th align="right">Posição</Th>
            <Th align="right">Lucro %</Th>
            <Th align="right" className="pr-5">D.Y.</Th>
          </tr>
        </thead>

        <tbody>
          {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-[13px] text-[#8F8F8F]">
                Nenhuma posição cadastrada.
              </td>
            </tr>
          )}

          {!isLoading && rows.map((row, i) => {
            const currency = row.currency ?? 'BRL'
            const dotColor = row.changePercent !== null && row.changePercent >= 0
              ? '#33AA3B'
              : row.changePercent !== null
                ? '#FF8FBE'
                : '#8F8F8F'

            return (
              <tr
                key={row.id}
                className={`
                  border-t border-white/[0.04]
                  transition-colors hover:bg-white/[0.025]
                  ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}
                `}
              >
                {/* Ativo */}
                <td className="py-3 pl-4 pr-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: dotColor }}
                      aria-hidden="true"
                    />
                    <Link
                      to={`/ativo/${row.ticker.toLowerCase()}`}
                      className="group flex flex-col leading-tight"
                    >
                      <span className="text-[13px] font-medium text-white group-hover:underline">
                        {row.ticker}
                      </span>
                      {row.name && (
                        <span className="max-w-[140px] truncate text-[10.5px] text-[#8F8F8F]">
                          {row.name}
                        </span>
                      )}
                    </Link>
                  </div>
                </td>

                {/* Classe */}
                <td className="px-2 py-3">
                  {row.type ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: `${assetClassColor(row.type)}22`,
                        color: assetClassColor(row.type),
                      }}
                    >
                      {assetClassLabel(row.type)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#8F8F8F]">—</span>
                  )}
                </td>

                {/* Qtd */}
                <td className="px-2 py-3 text-right text-[13px] text-white">
                  {fmtQty(row.quantity)}
                </td>

                {/* Preço médio */}
                <td className="px-2 py-3 text-right text-[13px] text-white">
                  {fmtMoney(row.averagePrice, currency)}
                </td>

                {/* Posição */}
                <td className="px-2 py-3 text-right text-[13px] font-medium text-white">
                  {fmtMoney(row.marketValueBRL)}
                </td>

                {/* Lucro % */}
                <td className="px-2 py-3 text-right text-[13px]">
                  <ChangeCell value={row.changePercent} currency={currency} />
                </td>

                {/* DY */}
                <td className="py-3 pl-2 pr-5 text-right text-[12px]">
                  {row.dy !== undefined && row.dy !== null
                    ? <span className="text-nf-yellow">{fmtPct(row.dy)}</span>
                    : <span className="text-[#8F8F8F]">—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
