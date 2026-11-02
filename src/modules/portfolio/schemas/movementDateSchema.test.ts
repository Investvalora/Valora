import { expect, it, vi } from 'vitest'
import { movementDateSchema } from './movementDateSchema'

it('recusa datas futuras e impossíveis, preservando hoje e datas históricas', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 30, 12))
  try {
    for (const value of ['2026-10-31', '2027-12-31', '2026-02-30', '2026-13-01', '', '2026-10-30T12:00:00Z']) {
      expect(movementDateSchema.safeParse(value).success).toBe(false)
    }
    expect(movementDateSchema.parse('2026-10-30')).toBe('2026-10-30')
    expect(movementDateSchema.parse('2024-02-29')).toBe('2024-02-29')
  } finally { vi.useRealTimers() }
})
