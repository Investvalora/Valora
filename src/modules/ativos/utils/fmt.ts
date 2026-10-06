/** Formatadores reutilizáveis para a tela Ativos */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pct2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const qty = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 8,
})

export function fmtMoney(v: number | null | undefined, currency: 'BRL' | 'USD' = 'BRL'): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return currency === 'USD' ? usd.format(v) : brl.format(v)
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return pct2.format(v) + '%'
}

export function fmtQty(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return qty.format(v)
}
