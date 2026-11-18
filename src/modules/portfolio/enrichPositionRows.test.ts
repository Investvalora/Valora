import { expect, it } from 'vitest'
import { enrichPositionRows } from './enrichPositionRows'
import { applyBazin } from '../valuation/utils/bazinCalculation'
import type { PositionRow, LatestQuote } from './types'
import type { FundamentalsRow } from '../score/types'
import type { DividendRaw } from '../dividends/types'
import { evaluateCustomStrategy } from '../valuation/utils/customStrategy'

it.each(['fii','reit','crypto','fixed_income'] as const)('does not feed company ROE/margin into strategies for %s',type=>{
 const [row]=enrichPositionRows({rows:[{ticker:'QA',type} as PositionRow],fundamentalsByTicker:new Map([['QA',{roe:20,net_margin:10,source:'yahoo'} as FundamentalsRow]]),dividendTotalsByTicker:new Map()})
 expect(row.roe).toBeNull();expect(row.netMargin).toBeNull()
 expect(evaluateCustomStrategy([{metric:'roe',operator:'gte',min:10}],'all',row)).toBeNull()
})
it('does not feed demonstrative ROE/margin into strategies for equities',()=>{
 const [row]=enrichPositionRows({rows:[{ticker:'QA',type:'stock_br'} as PositionRow],fundamentalsByTicker:new Map([['QA',{roe:20,net_margin:10,source:'seed'} as FundamentalsRow]]),dividendTotalsByTicker:new Map()})
 expect(row.roe).toBeNull();expect(row.netMargin).toBeNull()
})

it('payout vem da empresa e independe do patrimônio e recebimentos pessoais', () => {
  const fund = { lpa: 2, payout_ratio: 130, source: 'yahoo' } as FundamentalsRow
  const input = { fundamentalsByTicker: new Map([['ABC', fund]]), dividendTotalsByTicker: new Map([['ABC', 999]]) }
  const rows = enrichPositionRows({ ...input, rows: [1, 10, 0].map(quantity => ({ ticker: 'ABC', type: 'stock_us', currency: 'USD', quantity, averagePrice: 20 } as PositionRow)) })
  expect(rows.map(row => row.payoutPercent)).toEqual([130, 130, 130])
  expect(rows[0].yieldOnCostPercent).toBeNull()
})
it.each([0, -1, null])('não apresenta payout sem lucro positivo: %s', lpa => {
  const [row] = enrichPositionRows({ rows: [{ ticker: 'ABC', type: 'stock_br' } as PositionRow], fundamentalsByTicker: new Map([['ABC', { lpa, payout_ratio: 40 } as FundamentalsRow]]), dividendTotalsByTicker: new Map() })
  expect(row.payoutPercent).toBeNull()
})
it('YOC usa recebimentos e custo na mesma moeda, não BRL dividido por USD', () => {
  const input = { rows: [{ ticker: 'ABC', type: 'stock_us', currency: 'USD', quantity: 2, averagePrice: 20 } as PositionRow], fundamentalsByTicker: new Map(), dividendTotalsByTicker: new Map([['ABC', 20]]) }
  expect(enrichPositionRows(input)[0].yieldOnCostPercent).toBeNull()
  expect(enrichPositionRows({ ...input, dividendLocalTotalsByTicker: new Map([['ABC', 4]]) })[0].yieldOnCostPercent).toBe(10)
  expect(enrichPositionRows({ ...input, dividendLocalTotalsByTicker: new Map([['ABC', null]]) })[0].yieldOnCostPercent).toBeNull()
})

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
  expect(row.payoutPercent).toBeNull()
})
