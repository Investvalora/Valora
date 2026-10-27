import type { PositionRow } from '../../portfolio/types'

export function groupFixedIncome(rows: PositionRow[]) {
  const groups = new Map<string, PositionRow[]>()
  for (const row of rows) {
    const product = row.fixedIncome
    const key = product && Number.isFinite(product.rate)
      ? JSON.stringify([(row.name ?? row.ticker).trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR'), product.type, product.indexer, product.rate])
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
