import { FixedIncomeActions } from './FixedIncomeActions'
import { useState } from 'react'
import { AssetTableHeader } from './AssetTableHeader'
import type { PositionRow } from '../../portfolio/types'
import { fmtMoney, fmtPct } from '../utils/fmt'
import { groupFixedIncome } from '../utils/groupFixedIncome'

/** Valores de títulos não são preços unitários de ações. */
export function FixedIncomePositions({ rows }: { rows: PositionRow[] }) {
  const [expanded, setExpanded] = useState(true)
  const groups = groupFixedIncome(rows)
  if (!groups.length) return null
  const balance = groups.every((group) => group.balance !== null) ? groups.reduce((sum, group) => sum + group.balance!, 0) : null
  const weight = groups.every((group) => group.weight !== null) ? groups.reduce((sum, group) => sum + group.weight!, 0) : null
  const percent = (value: number | null) => value === null ? '—' : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  return <section aria-label="Renda fixa" className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.015]">
    <AssetTableHeader label="Renda fixa" count={groups.length} balance={balance} weight={weight} returnPercent={balance === null ? null : groups.reduce((sum, group) => sum + group.principal, 0) > 0 ? (balance / groups.reduce((sum, group) => sum + group.principal, 0) - 1) * 100 : null} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
    {expanded && <div id="fixed-income-table" role="region" aria-label="Tabela de renda fixa com rolagem horizontal" tabIndex={0} className="assets-table-scroll overflow-x-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9299ff]"><table aria-label="Posições de renda fixa" className="w-full min-w-[850px] border-collapse text-xs">
      <thead><tr className="bg-white/[0.04] text-[#8F8F8F]">{['Ativo', 'Aplicações', 'Principal restante', 'Saldo bruto', 'Ganho de capital', 'Rentabilidade de capital', '% na carteira', 'Opções'].map((label, index) => <th key={label} scope="col" className={`whitespace-nowrap px-4 py-3 font-medium ${index === 0 ? 'text-left' : 'text-right'}`}>{label}</th>)}</tr></thead>
      <tbody>{groups.map((group, index) => <tr key={group.key} className={`border-b border-white/5 text-white/70 hover:bg-white/[0.04] ${index % 2 ? 'bg-white/[0.015]' : ''}`}>
        <td className="px-4 py-4 font-medium text-white">{group.name}</td>
        <td className="px-4 py-4 text-right">{group.lots.length}</td>
        <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{fmtMoney(group.principal)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{fmtMoney(group.balance)}</td>
        <td className={`whitespace-nowrap px-4 py-4 text-right tabular-nums ${group.gain === null ? '' : group.gain >= 0 ? 'text-nf-green' : 'text-nf-pink'}`}>{fmtMoney(group.gain)}</td>
        <td className={`px-4 py-4 text-right tabular-nums ${group.returnPercent === null ? '' : group.returnPercent >= 0 ? 'text-nf-green' : 'text-nf-pink'}`}>{fmtPct(group.returnPercent)}</td>
        <td className="px-4 py-4 text-right tabular-nums">{percent(group.weight)}</td>
      <td className="px-2 py-2 text-right"><FixedIncomeActions name={group.name} lots={group.lots} /></td></tr>)}</tbody>
    </table></div>}
  </section>
}
