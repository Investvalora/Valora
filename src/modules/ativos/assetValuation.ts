import { derivePositionRows } from '../portfolio/positionRows'
import type { FixedIncomePosition, LatestQuote, PositionRow, PositionWithAsset } from '../portfolio/types'

/** A renda fixa usa o mesmo saldo/principal restante do resumo da carteira. */
export function valueAssets(positions: PositionWithAsset[], quotes: LatestQuote[], fixed: FixedIncomePosition[], usdRate: number | null) {
  const derived = derivePositionRows({ positions, quotes, usdRate })
  let invested = 0
  let costComplete = true
  for (const position of positions) {
    const rate = position.asset?.currency === 'USD' ? usdRate : 1
    const cost = Number(position.quantity) * Number(position.average_price)
    if (rate === null || !Number.isFinite(cost)) costComplete = false
    else invested += cost * rate
  }
  const fixedRows: PositionRow[] = fixed.map((position) => {
    const principal = Number(position.remaining_principal ?? position.principal)
    const value = Number(position.current_value ?? principal)
    if (!Number.isFinite(principal)) costComplete = false
    else invested += principal
    return {
      id: position.id, ticker: position.name, name: position.name, type: 'fixed_income', currency: 'BRL',
      fixedIncome: { type: position.type, indexer: position.indexer, rate: Number(position.rate) },
      quantity: 1, averagePrice: principal, acquisitionDate: position.application_date,
      quote: null, quotePrice: value, marketValueBRL: Number.isFinite(value) ? value : null,
      weightPercent: null, changePercent: principal > 0 ? (value / principal - 1) * 100 : null,
      isStaleQuote: false, usesUSDRate: false,
    }
  })
  const complete = derived.missingValueCount === 0 && fixedRows.every((row) => row.marketValueBRL !== null)
  const totalBRL = complete ? derived.totalBRL + fixedRows.reduce((sum, row) => sum + row.marketValueBRL!, 0) : 0
  const weighted = (row: PositionRow) => ({ ...row, weightPercent: complete && totalBRL > 0 && row.marketValueBRL !== null ? row.marketValueBRL / totalBRL * 100 : null })
  const rows = derived.rows.map(weighted)
  const fixedWeighted = fixedRows.map(weighted)
  return { rows, fixedRows: fixedWeighted, compositionRows: [...rows, ...fixedWeighted], totalBRL,
    patrimonioBRL: complete && (positions.length + fixed.length > 0) ? totalBRL : null,
    valorInvestidoBRL: costComplete && invested > 0 ? invested : null, complete,
    assetCount: positions.length + fixed.length }
}
