import type { DividendRow } from '../types'
export function ReceiptCosts({ row }: { row: DividendRow }) {
  const costs = row.receipt_costs
  if (!costs) return null
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: costs.currency, maximumFractionDigits: 8 }).format(value)
  return <span className="mt-1 block text-[11px] font-normal text-white/55">No extrato ({costs.currency}): imposto {money(costs.withholding)} · tarifa {money(costs.fees)}</span>
}
