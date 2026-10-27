export const ALLOCATION_CLASSES = ['stock_br', 'fii', 'bdr', 'stock_us', 'reit', 'crypto', 'etf_br', 'etf_us', 'fixed_income', 'unknown'] as const
export type AllocationTargets = Partial<Record<typeof ALLOCATION_CLASSES[number], number>>

export function validTargets(targets: AllocationTargets) {
  const entries = Object.entries(targets)
  return entries.length === 0 || (entries.every(([key, value]) => ALLOCATION_CLASSES.includes(key as typeof ALLOCATION_CLASSES[number]) && Number.isFinite(value) && value >= 0 && value <= 100 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8)
    && Math.abs(entries.reduce((sum, [, value]) => sum + Math.round(value * 100), 0) - 10000) === 0)
}

export function allocationGap(total: number, current: number, targetPercent: number) {
  return Math.round((total * targetPercent / 100 - current) * 100) / 100
}
