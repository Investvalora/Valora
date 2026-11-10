export const TREASURY_NAMES: Record<string, string> = {
  tesouro_ipca: 'Tesouro IPCA+', tesouro_pre: 'Tesouro Prefixado', tesouro_selic: 'Tesouro Selic',
}
export interface TreasuryPrice { type: string; maturity_date: string; date: string; base_price: number }
export interface TreasuryLot { name?: string; type?: string; maturity_date?: string | null; treasury_quantity?: number | null; application_date: string; active?: boolean; events?: unknown[] }
export function hasTreasuryQuantity(lot: TreasuryLot) {
  return Boolean(!/juros|renda\+|educa/i.test(lot.name ?? '') && lot.type && TREASURY_NAMES[lot.type] && lot.maturity_date && Number.isFinite(Number(lot.treasury_quantity)) && Number(lot.treasury_quantity) > 0)
}
/** Never infer units from invested money; this requires the actual units on the statement. */
export function treasuryValueAt(lot: TreasuryLot, date: string, prices: TreasuryPrice[]) {
  if (!hasTreasuryQuantity(lot)) return null
  if (date < lot.application_date) return { value: 0, date }
  // Coupon/redemption history requires quantities per event; do not scale by principal.
  if (lot.events?.length || date >= lot.maturity_date!) return null
  const quote = prices.filter(p => p.type === lot.type && p.maturity_date === lot.maturity_date && p.date <= date && Number(p.base_price) > 0)
    .sort((a,b) => b.date.localeCompare(a.date))[0]
  if (!quote || (Date.parse(date)-Date.parse(quote.date))/86400000 > 10) return null
  return { value: Number(lot.treasury_quantity) * Number(quote.base_price), date: quote.date }
}
const iso = (v: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (!match) return null
  const date = `${match[3]}-${match[2]}-${match[1]}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null
}
/** The official CSV uses semicolon delimiters and Brazilian decimals. Only plain bonds are supported. */
export function parseTreasuryLine(line: string): TreasuryPrice | null {
  const cells = line.replace(/^\uFEFF/, '').trim().split(';').map(s => s.trim().replace(/^"|"$/g,''))
  const type = Object.keys(TREASURY_NAMES).find(key => TREASURY_NAMES[key] === cells[0])
  const maturity_date = iso(cells[1] ?? ''), date = iso(cells[2] ?? '')
  const base_price = Number((cells[7] ?? '').replace(/\./g,'').replace(',','.'))
  return type && maturity_date && date && Number.isFinite(base_price) && base_price > 0 ? {type,maturity_date,date,base_price} : null
}
