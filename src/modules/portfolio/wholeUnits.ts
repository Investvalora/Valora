import type { AssetType } from './types'

export const WHOLE_UNITS_MESSAGE = 'Ações brasileiras, FIIs, BDRs e ETFs brasileiros exigem quantidade inteira. O mercado fracionário negocia unidades inteiras.'
export function requiresWholeUnits(type?: AssetType | null): boolean {
  return type !== undefined && type !== null && ['stock_br', 'fii', 'bdr', 'etf_br'].includes(type)
}
export function invalidFraction(type: AssetType | null | undefined, quantity: number): boolean {
  return requiresWholeUnits(type) && !Number.isInteger(quantity)
}

/** CSV quantities are normalized pt-BR text; do not lose fractional digits to Number. */
export function invalidCsvFraction(type: AssetType | undefined, quantity: string): boolean {
  return requiresWholeUnits(type) && /[1-9]/.test(quantity.split(',')[1] ?? '')
}
