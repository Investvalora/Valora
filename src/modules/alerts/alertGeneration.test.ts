import { describe, expect, it } from 'vitest'
import { findAlertCandidates } from '../../../supabase/functions/generate-alerts/logic'

const now = Date.parse('2026-09-10T00:00:00Z')

describe('findAlertCandidates', () => {
  it('detecta posição sem transações', () => {
    const candidates = findAlertCandidates([{ ticker: 'PETR4' }], [], [], now)

    expect(candidates).toEqual([
      expect.objectContaining({ type: 'position_no_transactions', ticker: 'PETR4' }),
    ])
  })

  it('detecta cotação com mais de sete dias somente para posições', () => {
    const candidates = findAlertCandidates(
      [{ ticker: 'PETR4' }],
      [{ ticker: 'PETR4' }],
      [{ ticker: 'PETR4', date: '2026-08-01' }],
      now,
    )

    expect(candidates).toEqual([
      expect.objectContaining({ type: 'stale_quote', ticker: 'PETR4', last_quote_date: '2026-08-01' }),
    ])
  })

  it('não gera candidato para carteira regular nem para ticker sem posição', () => {
    const candidates = findAlertCandidates(
      [{ ticker: 'PETR4' }],
      [{ ticker: 'PETR4' }],
      [{ ticker: 'PETR4', date: '2026-09-09' }, { ticker: 'VALE3', date: '2026-08-01' }],
      now,
    )

    expect(candidates).toEqual([])
  })
})