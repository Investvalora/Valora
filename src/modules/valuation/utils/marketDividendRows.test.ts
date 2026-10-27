import { expect, it } from 'vitest'
import { marketDividendRows } from './marketDividendRows'
import { applyBazin } from './bazinCalculation'
import { strategyReference } from './strategyReference'
import type { YahooDividendsResponse } from '../types'
import type { PositionRow } from '../../portfolio/types'
import type { ValuationStrategy } from '../hooks/useStrategies'

it('usa eventos de mercado de 12 meses e ignora o total resumido, datas futuras e inválidos', () => {
  const response: YahooDividendsResponse = { ticker: 'MXRF11', symbol: 'MXRF11.SA', source: 'yahoo', annualDividend: 0.18, payments: Array.from({ length: 12 }, (_, month) => ({ date: `2026-${String(month + 1).padStart(2, '0')}-15`, amount: 0.1 })) }
  const rows = marketDividendRows('MXRF11', { ...response, payments: [...response.payments, { date: '2027-01-15', amount: 100 }, { date: '2025-01-15', amount: 100 }, { date: '2026-01-01', amount: NaN }] }, '2026-01-01', '2026-12-31')
  expect(rows).toHaveLength(12)
  const bazin = applyBazin(['MXRF11'], rows, [], 0.06, new Map([['MXRF11', 'BRL']]), 1).get('MXRF11')!
  expect(bazin.annualDividend).toBeCloseTo(1.2)
  expect(bazin.ceilingPriceLocal).toBeCloseTo(20)
  const strategy = { method: 'fii', safety_discount: 0, fii_inflation: 0.05, fii_treasury: 0.08, fii_tax: 0.15, fii_premium: 0.01 } as ValuationStrategy
  expect(strategyReference(strategy, { type: 'fii', bazinCeiling: bazin.ceilingPriceLocal } as PositionRow)).toBeCloseTo(9.62, 1)
})
it('rejeita resposta de outro ticker ou fonte e não inventa pagamentos', () => {
  const response: YahooDividendsResponse = { ticker: 'MXRF11', symbol: 'MXRF11.SA', source: 'yahoo', annualDividend: 0, payments: [] }
  expect(marketDividendRows('MXRF11', response, '2026-01-01', '2026-12-31')).toEqual([])
  expect(() => marketDividendRows('HGLG11', response, '2026-01-01', '2026-12-31')).toThrow()
})
