import { expect, it } from 'vitest'
import { enrichPositionRows } from './enrichPositionRows'
import { applyBazin } from '../valuation/utils/bazinCalculation'
import type { PositionRow, LatestQuote } from './types'
import type { FundamentalsRow } from '../score/types'
import type { DividendRaw } from '../dividends/types'

it('mantém os dois preços de referência na moeda da cotação nas posições USD', () => {
  const row = { ticker: 'ABC', currency: 'USD', type: 'stock_us', quantity: 1, quotePrice: 25, averagePrice: 20 } as PositionRow
  const bazin = applyBazin(['ABC'], [{ ticker: 'ABC', value_per_share: 2.4 } as DividendRaw], [{ ticker: 'ABC', close: 25 } as LatestQuote], 0.06, new Map([['ABC', 'USD']]), 5)
  const [enriched] = enrichPositionRows({ rows: [row], fundamentalsByTicker: new Map([['ABC', { lpa: 2, vpa: 20 } as FundamentalsRow]]), dividendTotalsByTicker: new Map(), bazinByTicker: bazin })
  expect(enriched.grahamPrice).toBe(30)
  expect(enriched.bazinCeiling).toBe(40)
  expect(bazin.get('ABC')?.ceilingPrice).toBe(200)
})

it('não calcula Graham para fundos mesmo com LPA e VPA positivos', () => {
  const [row] = enrichPositionRows({ rows: [{ ticker: 'FII11', type: 'fii' } as PositionRow], fundamentalsByTicker: new Map([['FII11', { lpa: 2, vpa: 20 } as FundamentalsRow]]), dividendTotalsByTicker: new Map() })
  expect(row.grahamPrice).toBeNull()
})
