import { derivePositionRows } from '../portfolio/positionRows'
import type { FixedIncomePosition, LatestQuote, PositionRow, PositionWithAsset } from '../portfolio/types'

/** A renda fixa usa o mesmo saldo/principal restante do resumo da carteira. */
export function valueAssets(positions: PositionWithAsset[], quotes: LatestQuote[], fixed: FixedIncomePosition[], usdRate: number | null, acquisitionCosts?: Map<string, number | null>) {
  const derived = derivePositionRows({ positions, quotes, usdRate })
  let invested = 0
  let costComplete = true
  for (const position of positions) {
    const cost = acquisitionCosts ? acquisitionCosts.get(position.id) ?? null : position.asset?.currency === 'USD' ? null : Number(position.quantity) * Number(position.average_price)
    if (cost === null || !Number.isFinite(cost)) costComplete = false
    else invested += cost
  }
  const fixedRows: PositionRow[] = fixed.map((position) => {
    const principal = Number(position.remaining_principal ?? position.principal)
    const value = position.current_value === null && Number(position.treasury_quantity)>0 ? NaN : Number(position.current_value ?? principal)
    if (!Number.isFinite(principal)) costComplete = false
    else invested += principal
    return {
      id: position.id, ticker: position.name, name: position.name, type: 'fixed_income', currency: 'BRL',
      fixedIncome: { type: position.type, indexer: position.indexer, rate: Number(position.rate), treasury_quantity: position.treasury_quantity, maturity_date: position.maturity_date, valuation_method: position.valuation_method, valuation_price_date: position.valuation_price_date },
      quantity: 1, averagePrice: principal, acquisitionDate: position.application_date,
      quote: null, quotePrice: Number.isFinite(value) ? value : 0, marketValueBRL: Number.isFinite(value) ? value : null,
      weightPercent: null, changePercent: Number.isFinite(value) && principal > 0 ? (value / principal - 1) * 100 : null,
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
