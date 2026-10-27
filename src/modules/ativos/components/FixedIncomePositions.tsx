import type { PositionRow } from '../../portfolio/types'
import { fmtMoney, fmtPct } from '../utils/fmt'

/** Valores de títulos não são preços unitários de ações. */
export function FixedIncomePositions({ rows }: { rows: PositionRow[] }) {
  if (!rows.length) return null
  return <section className="rounded-xl border border-white/10 p-5">
    <h2 className="mb-3 text-base font-semibold">Posições de renda fixa</h2>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Posições de renda fixa</caption>
      <thead className="text-white/50"><tr><th>Título</th><th>Principal restante</th><th>Saldo bruto</th><th>Ganho de capital</th><th>% na carteira</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/10">
        <td className="py-3 pr-4">{row.name}</td><td>{fmtMoney(row.averagePrice)}</td>
        <td>{fmtMoney(row.marketValueBRL)}</td><td>{fmtMoney(row.marketValueBRL === null ? null : row.marketValueBRL - row.averagePrice)}</td>
        <td>{fmtPct(row.weightPercent)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}
