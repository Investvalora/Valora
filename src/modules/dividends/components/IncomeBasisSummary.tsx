import type { DividendRow } from '../types'

/** Public announcements estimate gross entitlement, never the broker's net credit. */
export function IncomeBasisSummary({ rows }: { rows: DividendRow[] }) {
  if (!rows.length) return null
  const confirmed = rows.filter(row => row.source === 'imported')
  const estimates = rows.filter(row => row.source !== 'imported')
  const money = (items: DividendRow[]) => items.reduce((sum,row) => sum + row.total_value,0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  return <aside aria-label="Base dos proventos" className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-white/60">
    <p>Líquidos importados: <strong className="text-white/90">{money(confirmed)}</strong> · Estimativas brutas: <strong className="text-white/90">{money(estimates)}</strong></p>
    {estimates.length > 0 && <p className="mt-2">{estimates.length} evento(s) sem confirmação do líquido recebido. Impostos, tarifas e câmbio da corretora podem mudar o crédito. O total exibido combina essas duas bases; confira o extrato antes de tratá-lo como renda líquida.</p>}
  </aside>
}
