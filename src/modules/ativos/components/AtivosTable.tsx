/**
 * AtivosTable
 * Tabela de posições agrupada por classe de ativo.
 * Colunas: Ativo | Classe | Qtd | Preço médio | Posição | Lucro% | DY
 * Cada grupo tem um cabeçalho expansível com resumo (total, variação, % carteira).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'
import type { PositionRow, AssetCurrency } from '../../portfolio/types'
import {
  assetClassLabel,
  assetClassColor,
  groupRowsByClass,
} from '../../portfolio/composition'
import { fmtMoney, fmtPct, fmtQty } from '../utils/fmt'

type Props = {
  rows: PositionRow[]
  totalBRL: number
  isLoading?: boolean
}

// ── formatadores locais ────────────────────────────────────────────────────
const signedPct = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})
function fmtSignedPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  return signedPct.format(v) + '%'
}

// ── célula de variação colorida ────────────────────────────────────────────
function ChangeCell({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-[#8F8F8F]">—</span>
  }
  const positive = value >= 0
  return (
    <span
      className={`flex items-center justify-end gap-1 ${
        positive ? 'text-nf-green' : 'text-nf-pink'
      }`}
    >
      {positive ? (
        <TrendingUp className="h-[11px] w-[11px] shrink-0" strokeWidth={2} aria-hidden="true" />
      ) : (
        <TrendingDown className="h-[11px] w-[11px] shrink-0" strokeWidth={2} aria-hidden="true" />
      )}
      {fmtPct(value)}
    </span>
  )
}

// ── th helper ──────────────────────────────────────────────────────────────
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
      className={`px-2 py-2.5 text-[11px] font-medium text-[#8F8F8F] ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  )
}

// ── skeleton ───────────────────────────────────────────────────────────────
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

// ── cabeçalho de grupo ─────────────────────────────────────────────────────
function GroupHeader({
  label,
  color,
  count,
  totalValueBRL,
  avgChangePercent,
  weightPercent,
  expanded,
  onToggle,
}: {
  label: string
  color: string
  count: number
  totalValueBRL: number | null
  avgChangePercent: number | null
  weightPercent: number | null
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <tr
      className="cursor-pointer select-none border-t border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      {/* Classe + ícone chevron */}
      <td className="py-2.5 pl-4 pr-2" colSpan={1}>
        <div className="flex items-center gap-2">
          {/* Ícone colorido da classe */}
          <span
            className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[7px] text-[12px] font-bold"
            style={{ background: `${color}22`, color }}
            aria-hidden="true"
          >
            {label[0]}
          </span>
          <span className="text-[13px] font-semibold text-white">{label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[#8F8F8F] transition-transform duration-200 ${
              expanded ? 'rotate-0' : '-rotate-90'
            }`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </td>

      {/* Ativos */}
      <td className="px-2 py-2.5 text-[12px] text-[#8F8F8F]">
        {count} {count === 1 ? 'ativo' : 'ativos'}
      </td>

      {/* Qtd — vazio */}
      <td className="px-2 py-2.5" />

      {/* Preço médio — vazio */}
      <td className="px-2 py-2.5" />

      {/* Valor total */}
      <td className="px-2 py-2.5 text-right text-[13px] font-semibold text-white">
        {fmtMoney(totalValueBRL)}
      </td>

      {/* Variação média */}
      <td className="px-2 py-2.5 text-right text-[13px]">
        <ChangeCell value={avgChangePercent} />
      </td>

      {/* % carteira */}
      <td className="py-2.5 pl-2 pr-5 text-right text-[12px] text-[#8F8F8F]">
        {weightPercent !== null ? fmtSignedPct(weightPercent).replace('+', '') : '—'}
      </td>
    </tr>
  )
}

// ── linha de ativo ─────────────────────────────────────────────────────────
function AssetRow({ row, striped }: { row: PositionRow; striped: boolean }) {
  const currency: AssetCurrency = row.currency ?? 'BRL'
  const dotColor =
    row.changePercent !== null && row.changePercent >= 0
      ? '#33AA3B'
      : row.changePercent !== null
        ? '#FF8FBE'
        : '#8F8F8F'

  return (
    <tr
      className={`border-t border-white/[0.03] transition-colors hover:bg-white/[0.025] ${
        striped ? 'bg-white/[0.015]' : ''
      }`}
    >
      {/* Ativo */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
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

      {/* Classe (badge pequeno dentro da linha) */}
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
        <ChangeCell value={row.changePercent} />
      </td>

      {/* DY */}
      <td className="py-3 pl-2 pr-5 text-right text-[12px]">
        {row.dy !== undefined && row.dy !== null ? (
          <span className="text-nf-yellow">{fmtPct(row.dy)}</span>
        ) : (
          <span className="text-[#8F8F8F]">—</span>
        )}
      </td>
    </tr>
  )
}

// ── componente principal ───────────────────────────────────────────────────
export function AtivosTable({ rows, totalBRL, isLoading = false }: Props) {
  // Todos os grupos começam expandidos
  const groups = groupRowsByClass(rows, totalBRL)
  const initialExpanded = Object.fromEntries(
    groups.map(({ summary }) => [summary.key, true])
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded)

  // Atualiza quando os grupos mudarem (ex: novos dados carregados)
  // Mantém o estado do que o usuário tocou, expande novos grupos
  const toggleGroup = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

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
            <Th align="right" className="pr-5">
              D.Y.
            </Th>
          </tr>
        </thead>

        <tbody>
          {/* ── Loading ── */}
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {/* ── Vazio ── */}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="py-10 text-center text-[13px] text-[#8F8F8F]"
              >
                Nenhuma posição cadastrada.
              </td>
            </tr>
          )}

          {/* ── Grupos ── */}
          {!isLoading &&
            groups.map(({ summary, rows: groupRows }) => {
              const isExpanded = expanded[summary.key] !== false // default true
              return (
                <>
                  <GroupHeader
                    key={`hdr-${summary.key}`}
                    label={summary.label}
                    color={summary.color}
                    count={summary.count}
                    totalValueBRL={summary.totalValueBRL}
                    avgChangePercent={summary.avgChangePercent}
                    weightPercent={summary.weightPercent}
                    expanded={isExpanded}
                    onToggle={() => toggleGroup(summary.key)}
                  />
                  {isExpanded &&
                    groupRows.map((row, i) => (
                      <AssetRow
                        key={row.id}
                        row={row}
                        striped={i % 2 === 1}
                      />
                    ))}
                </>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
