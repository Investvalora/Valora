/**
 * AtivosTable
 * Tabela de posições agrupada por classe de ativo.
 * Grupos colapsáveis mostram resumo; ao expandir, exibem todas as colunas do Figma:
 * Ticker | Nome | Quant. | Preço médio | Cotação | Saldo | % carteira | Variação |
 * Proventos(12M) | Payout% | P/L | P/VP | DY%
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Info, TrendingDown, TrendingUp } from 'lucide-react'
import type { PositionRow, AssetCurrency } from '../../portfolio/types'
import {
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

function fmtOptional(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
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
      {Array.from({ length: 13 }).map((_, i) => (
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
      {/* Classe + ícone chevron — colSpan 2 (Ticker+Nome agrupados no header) */}
      <td className="py-2.5 pl-4 pr-2" colSpan={2}>
        <div className="flex items-center gap-2">
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

      {/* Preço médio — vazio */}
      <td className="px-2 py-2.5" />

      {/* Cotação — vazio */}
      <td className="px-2 py-2.5" />

      {/* Valor total */}
      <td className="px-2 py-2.5 text-right text-[13px] font-semibold text-white">
        {fmtMoney(totalValueBRL)}
      </td>

      {/* % carteira */}
      <td className="px-2 py-2.5 text-right text-[12px] text-[#8F8F8F]">
        {weightPercent !== null ? fmtSignedPct(weightPercent).replace('+', '') : '—'}
      </td>

      {/* Variação média */}
      <td className="px-2 py-2.5 text-right text-[13px]">
        <ChangeCell value={avgChangePercent} />
      </td>

      {/* Proventos(12M), Payout%, P/L, P/VP, DY — vazios no header */}
      <td className="px-2 py-2.5" />
      <td className="px-2 py-2.5" />
      <td className="px-2 py-2.5" />
      <td className="px-2 py-2.5" />
      <td className="py-2.5 pl-2 pr-5" />
    </tr>
  )
}

// ── linha de ativo expandida ────────────────────────────────────────────────
function AssetRow({ row, striped }: { row: PositionRow; striped: boolean }) {
  const currency: AssetCurrency = row.currency ?? 'BRL'

  return (
    <tr
      className={`border-t border-white/[0.03] transition-colors hover:bg-white/[0.025] ${
        striped ? 'bg-white/[0.015]' : ''
      }`}
    >
      {/* Ticker */}
      <td className="py-3 pl-4 pr-2">
        <Link
          to={`/ativo/${row.ticker.toLowerCase()}`}
          className="text-[13px] font-medium text-white hover:underline"
        >
          {row.ticker}
        </Link>
      </td>

      {/* Nome */}
      <td className="px-2 py-3">
        <span className="max-w-[120px] truncate block text-[12px] text-[#8F8F8F]">
          {row.name ?? '—'}
        </span>
      </td>

      {/* Quant. */}
      <td className="px-2 py-3 text-right text-[13px] text-white tabular-nums">
        {fmtQty(row.quantity)}
      </td>

      {/* Preço médio */}
      <td className="px-2 py-3 text-right text-[13px] text-white tabular-nums">
        {fmtMoney(row.averagePrice, currency)}
      </td>

      {/* Cotação — com ícone info quando stale */}
      <td className="px-2 py-3 text-right">
        <span className="inline-flex items-center gap-1 justify-end">
          <span className="text-[13px] text-white tabular-nums">
            {Number.isFinite(row.quotePrice) ? fmtMoney(row.quotePrice, currency) : '—'}
          </span>
          {row.isStaleQuote && (
            <Info
              className="h-[11px] w-[11px] shrink-0 text-[#8F8F8F]"
              strokeWidth={2}
              aria-label="Cotação desatualizada"
            />
          )}
        </span>
      </td>

      {/* Saldo (valor de mercado em BRL) */}
      <td className="px-2 py-3 text-right text-[13px] font-medium text-white tabular-nums">
        {fmtMoney(row.marketValueBRL)}
      </td>

      {/* % carteira */}
      <td className="px-2 py-3 text-right text-[12px] text-[#8F8F8F] tabular-nums">
        {row.weightPercent !== null ? fmtSignedPct(row.weightPercent).replace('+', '') : '—'}
      </td>

      {/* Variação */}
      <td className="px-2 py-3 text-right text-[13px]">
        <ChangeCell value={row.changePercent} />
      </td>

      {/* Proventos 12M */}
      <td className="px-2 py-3 text-right text-[12px] tabular-nums">
        {row.proventosRecebidosBRL !== null && row.proventosRecebidosBRL !== undefined ? (
          <span className="text-nf-green">{fmtMoney(row.proventosRecebidosBRL)}</span>
        ) : (
          <span className="text-[#8F8F8F]">—</span>
        )}
      </td>

      {/* Payout% */}
      <td className="px-2 py-3 text-right text-[12px] text-white/70 tabular-nums">
        {row.payoutPercent !== null && row.payoutPercent !== undefined
          ? fmtOptional(row.payoutPercent) + '%'
          : '—'}
      </td>

      {/* P/L */}
      <td className="px-2 py-3 text-right text-[12px] text-white/70 tabular-nums">
        {row.pl !== null && row.pl !== undefined ? fmtOptional(row.pl) : '—'}
      </td>

      {/* P/VP */}
      <td className="px-2 py-3 text-right text-[12px] text-white/70 tabular-nums">
        {row.pvp !== null && row.pvp !== undefined ? fmtOptional(row.pvp) : '—'}
      </td>

      {/* DY% */}
      <td className="py-3 pl-2 pr-5 text-right text-[12px] tabular-nums">
        {row.dy !== null && row.dy !== undefined ? (
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
  const groups = groupRowsByClass(rows, totalBRL)
  const initialExpanded = Object.fromEntries(
    groups.map(({ summary }) => [summary.key, true])
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded)

  const toggleGroup = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] border-collapse">
        <thead>
          <tr className="bg-white/[0.04]">
            <Th className="pl-4">Ticker</Th>
            <Th>Nome</Th>
            <Th align="right">Quant.</Th>
            <Th align="right">Preço médio</Th>
            <Th align="right">
              <span className="inline-flex items-center gap-1 justify-end">
                Cotação
                <Info className="h-3 w-3 text-[#8F8F8F]" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </Th>
            <Th align="right">Saldo</Th>
            <Th align="right">% carteira</Th>
            <Th align="right">Variação</Th>
            <Th align="right">Proventos (12M)</Th>
            <Th align="right">Payout%</Th>
            <Th align="right">P/L</Th>
            <Th align="right">P/VP</Th>
            <Th align="right" className="pr-5">DY%</Th>
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
                colSpan={13}
                className="py-10 text-center text-[13px] text-[#8F8F8F]"
              >
                Nenhuma posição cadastrada.
              </td>
            </tr>
          )}

          {/* ── Grupos ── */}
          {!isLoading &&
            groups.map(({ summary, rows: groupRows }) => {
              const isExpanded = expanded[summary.key] !== false
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
