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

import { findBazinAlertCandidates } from '../../../supabase/functions/generate-alerts/logic'
import type { BazinDividend } from '../../../supabase/functions/generate-alerts/logic'

// Helpers
const pos = (ticker: string) => ({ ticker })
const div = (ticker: string, value: number): BazinDividend => ({ ticker, value_per_share: value })
const qt = (ticker: string, close: number) => ({ ticker, date: '2026-09-11', close })

describe('findBazinAlertCandidates', () => {
  const MIN_DY = 0.06

  it('oportunidade: margem > 15% → alerta opportunity', () => {
    // teto = 2.40 / 0.06 = 40; cotação = 33; margem ≈ 21%
    const candidates = findBazinAlertCandidates(
      [pos('PETR4')],
      [div('PETR4', 1.20), div('PETR4', 1.20)],
      [qt('PETR4', 33)],
      MIN_DY,
    )
    expect(candidates).toEqual([
      expect.objectContaining({ type: 'opportunity', ticker: 'PETR4' }),
    ])
  })

  it('sobrevalorizado: margem < -20% → alerta overvalued', () => {
    // teto = 2.40 / 0.06 = 40; cotação = 52; margem ≈ -23%
    const candidates = findBazinAlertCandidates(
      [pos('VALE3')],
      [div('VALE3', 1.20), div('VALE3', 1.20)],
      [qt('VALE3', 52)],
      MIN_DY,
    )
    expect(candidates).toEqual([
      expect.objectContaining({ type: 'overvalued', ticker: 'VALE3' }),
    ])
  })

  it('margem entre -20% e 15% → nenhum alerta', () => {
    // teto = 40; cotação = 38; margem ≈ 5%
    const candidates = findBazinAlertCandidates(
      [pos('ITUB4')],
      [div('ITUB4', 1.20), div('ITUB4', 1.20)],
      [qt('ITUB4', 38)],
      MIN_DY,
    )
    expect(candidates).toEqual([])
  })

  it('sem dividendos nos últimos 365 dias → skip silencioso', () => {
    const candidates = findBazinAlertCandidates(
      [pos('BBAS3')],
      [], // sem dividendos
      [qt('BBAS3', 30)],
      MIN_DY,
    )
    expect(candidates).toEqual([])
  })

  it('sem cotação → skip silencioso', () => {
    const candidates = findBazinAlertCandidates(
      [pos('WEGE3')],
      [div('WEGE3', 2.00)],
      [], // sem cotações
      MIN_DY,
    )
    expect(candidates).toEqual([])
  })

  it('cotação zero → skip silencioso', () => {
    const candidates = findBazinAlertCandidates(
      [pos('SANB11')],
      [div('SANB11', 2.00)],
      [qt('SANB11', 0)],
      MIN_DY,
    )
    expect(candidates).toEqual([])
  })

  it('processa múltiplos tickers de forma independente', () => {
    const candidates = findBazinAlertCandidates(
      [pos('PETR4'), pos('VALE3'), pos('BBAS3')],
      [div('PETR4', 1.20), div('PETR4', 1.20), div('VALE3', 1.20), div('VALE3', 1.20)],
      [qt('PETR4', 33), qt('VALE3', 52)], // BBAS3 sem cotação
      MIN_DY,
    )
    const types = candidates.map((c) => `${c.type}:${c.ticker}`)
    expect(types).toContain('opportunity:PETR4')
    expect(types).toContain('overvalued:VALE3')
    expect(candidates.find((c) => c.ticker === 'BBAS3')).toBeUndefined()
  })

  it('alerta de oportunidade tem título e descrição não-vazios', () => {
    const candidates = findBazinAlertCandidates(
      [pos('PETR4')],
      [div('PETR4', 1.20), div('PETR4', 1.20)],
      [qt('PETR4', 33)],
      MIN_DY,
    )
    expect(candidates[0].title).toBeTruthy()
    expect(candidates[0].description).toContain('40,00')
    expect(candidates[0].description).toContain('6%')
  })
})
