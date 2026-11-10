import type { PositionRow } from '../../portfolio/types'

export function groupFixedIncome(rows: PositionRow[]) {
  const groups = new Map<string, PositionRow[]>()
  for (const row of rows) {
    const product = row.fixedIncome
    // A Treasury bond is identified by its type and maturity. Purchase yields
    // belong to each lot and must not split holdings of the same bond.
    // Keep coupon/other variants and incomplete identities separate.
    const consolidatedTreasury = product?.type.startsWith('tesouro_') &&
      product.maturity_date && !/juros|renda\+|educa/i.test(row.name ?? row.ticker)
    const key = product && consolidatedTreasury
      ? JSON.stringify(['treasury', product.type, product.indexer, product.maturity_date])
      : product && Number.isFinite(product.rate)
      ? JSON.stringify([(row.name ?? row.ticker).trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR'), product.type, product.indexer, product.rate, ...(product.type.startsWith('tesouro_') ? [product.maturity_date ?? null] : [])])
      : row.id
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()].map(([key, lots]) => {
    const principal = lots.reduce((sum, row) => sum + row.averagePrice, 0)
    const balance = lots.every((row) => row.marketValueBRL !== null) ? lots.reduce((sum, row) => sum + row.marketValueBRL!, 0) : null
    const weight = lots.every((row) => row.weightPercent !== null) ? lots.reduce((sum, row) => sum + row.weightPercent!, 0) : null
    return { key, name: lots[0].name ?? lots[0].ticker, lots, principal, balance, weight,
      gain: balance === null ? null : balance - principal,
      returnPercent: balance === null || principal <= 0 ? null : (balance / principal - 1) * 100 }
  })
}
