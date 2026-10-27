import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AssetTableHeader } from './AssetTableHeader'
import type { PositionRow } from '../../portfolio/types'
import { groupRowsByClass } from '../../portfolio/composition'
import { fmtMoney, fmtPct, fmtQty } from '../utils/fmt'
import { ASSET_COLUMNS, DEFAULT_ASSET_COLUMNS, type AssetColumnId } from '../hooks/useAssetColumns'
import type { ValuationStrategy } from '../../valuation/hooks/useStrategies'
import { StrategyValue } from '../../valuation/components/StrategyValue'
import { strategyAppliesTo } from '../../valuation/utils/strategyAssetTypes'

type Props = { rows: PositionRow[]; totalBRL: number; isLoading?: boolean; visibleColumns?: AssetColumnId[]; emptyMessage?: string; strategies?: ValuationStrategy[]; tableLabel?: string }
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const number = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : decimal.format(value)
const percent = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : `${decimal.format(value)}%`

function cell(column: AssetColumnId, row: PositionRow): ReactNode {
  const currency = row.currency ?? 'BRL'
  switch (column) {
    case 'ticker': return <Link to={`/ativo/${row.ticker.toLowerCase()}`} className="font-medium text-white hover:underline">{row.ticker}</Link>
    case 'name': return <span className="block max-w-[180px] truncate" title={row.name ?? undefined}>{row.name ?? '—'}</span>
    case 'quantity': return fmtQty(row.quantity)
    case 'averagePrice': return fmtMoney(row.averagePrice, currency)
    case 'quote': return <span title={row.isStaleQuote ? 'Cotação desatualizada' : undefined}>{Number.isFinite(row.quotePrice) ? fmtMoney(row.quotePrice, currency) : '—'}{row.isStaleQuote ? ' ⓘ' : ''}</span>
    case 'balance': return fmtMoney(row.marketValueBRL)
    case 'weight': return percent(row.weightPercent)
    case 'change': return <span className={row.changePercent === null ? '' : row.changePercent >= 0 ? 'text-nf-green' : 'text-nf-pink'}>{fmtPct(row.changePercent)}</span>
    case 'return': {
      const value = row.averagePrice > 0 && Number.isFinite(row.quotePrice) ? (row.quotePrice / row.averagePrice - 1) * 100 : null
      return <span className={value === null ? '' : value >= 0 ? 'text-nf-green' : 'text-nf-pink'}>{fmtPct(value)}</span>
    }
    case 'graham': return fmtMoney(row.grahamPrice ?? null, currency)
    case 'bazin': return fmtMoney(row.bazinCeiling ?? null, currency)
    case 'dividends': return fmtMoney(row.proventosRecebidosBRL ?? null)
    case 'yoc': return percent(row.yieldOnCostPercent)
    case 'dy': return percent(row.dy)
    case 'payout': return percent(row.payoutPercent)
    case 'pl': return number(row.pl)
    case 'pvp': return number(row.pvp)
    case 'roe': return percent(row.roe)
    case 'netMargin': return percent(row.netMargin)
    case 'score': return number(row.score)
    case 'acquisition': return row.acquisitionDate ? row.acquisitionDate.slice(0, 10).split('-').reverse().join('/') : '—'
  }
}

export function AtivosTable({ rows, totalBRL, isLoading = false, visibleColumns = DEFAULT_ASSET_COLUMNS, emptyMessage = 'Nenhuma posição cadastrada.', strategies = [], tableLabel = 'Posições por classe de ativo' }: Props) {
  const groups = groupRowsByClass(rows, totalBRL)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const basicColumns = ASSET_COLUMNS.filter((column) => ('locked' in column && column.locked) || visibleColumns.includes(column.id))
  const customColumns = strategies.filter((strategy) => strategy.show_in_assets && rows.some((row) => strategyAppliesTo(strategy, row.type)))
  const columns: { id: string; label: string; strategy?: ValuationStrategy }[] = [...basicColumns]
  const priceIndex = Math.max(...columns.map((column, index) => ['quote', 'graham', 'bazin'].includes(column.id) ? index : -1)) + 1
  const strategyColumn = (strategy: ValuationStrategy) => ({ id: `strategy-${strategy.id}`, label: strategy.name, strategy })
  columns.splice(Math.max(2, priceIndex), 0, ...customColumns.filter((strategy) => strategy.method !== 'custom').map(strategyColumn))
  columns.push(...customColumns.filter((strategy) => strategy.method === 'custom').map(strategyColumn))
  const columnCount = columns.length
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10">
    {!isLoading && groups.map(({ summary }) => <AssetTableHeader key={summary.key} label={summary.label} color={summary.color} count={summary.count} balance={summary.totalValueBRL} weight={summary.weightPercent} expanded={!collapsed.has(summary.key)} onToggle={() => setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(summary.key)) next.delete(summary.key); else next.add(summary.key)
      return next
    })} />)}
    <div hidden={groups.length > 0 && groups.every(({ summary }) => collapsed.has(summary.key))} tabIndex={0} role="region" aria-label="Tabela de ativos com rolagem horizontal" className="assets-table-scroll overflow-x-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9299ff]">
      <table aria-label={tableLabel} className="w-full border-collapse" style={{ minWidth: Math.max(420, columnCount * 125) }}>
        <thead><tr className="bg-white/[0.04]">
          {columns.map((column) => <th key={column.id} scope="col" className={`whitespace-nowrap px-4 py-3 text-xs font-medium text-[#8F8F8F] ${column.id === 'ticker' ? 'sticky left-0 z-10 bg-[#252525] text-left' : column.id === 'name' ? 'text-left' : 'text-right'}`}>{column.label}</th>)}
        </tr></thead>
        <tbody>
          {isLoading && Array.from({ length: 6 }, (_, index) => <tr key={index}>{Array.from({ length: columnCount }, (_, column) => <td key={column} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-white/5" /></td>)}</tr>)}
          {!isLoading && rows.length === 0 && <tr><td colSpan={columnCount} className="py-10 text-center text-sm text-white/50">{emptyMessage}</td></tr>}
          {!isLoading && groups.map(({ summary, rows: groupRows }) => {
            const expanded = !collapsed.has(summary.key)
            return <Fragment key={summary.key}>
              {expanded && groupRows.map((row, index) => <tr key={row.id} className={`border-b border-white/5 hover:bg-white/[0.04] ${index % 2 ? 'bg-white/[0.015]' : ''}`}>
                {columns.map((column) => <td key={column.id} className={`whitespace-nowrap px-4 py-4 text-xs tabular-nums text-white/70 ${column.id === 'ticker' ? 'sticky left-0 z-10 bg-[#1c1c1c] text-left' : column.id === 'name' ? 'text-left' : 'text-right'}`}>{column.strategy ? <StrategyValue strategy={column.strategy} row={row} /> : cell(column.id as AssetColumnId, row)}</td>)}
              </tr>)}
            </Fragment>
          })}
        </tbody>
      </table>
    </div>
    </div>
  )
}
