import { expect, it } from 'vitest'
import { historicalReturns, summarizeHistoricalReturns } from './historicalReturns'
import type { ReturnTrade } from './historicalReturns'
import type { PositionWithAsset } from '../../portfolio/types'
import type { HistoricalFixedIncome } from '../../dashboard/historicalValuation'
import type { DividendRow } from '../../dividends/types'

const position = (ticker = 'AAA', qty = 1, currency = 'BRL') => ({ wallet_id: 'w', ticker, quantity: qty, average_price: 100, acquisition_date: '2026-01-02', asset: { currency, type: 'stock_br' } }) as PositionWithAsset
const trade = (date: string, qty = 1, type = 'buy', price = 100): ReturnTrade => ({ wallet_id: 'w', ticker: 'AAA', quantity: qty, type, price, transaction_date: date, seq: 1, currency: 'BRL' }) as ReturnTrade
const price = (date: string, close = 100, ticker = 'AAA') => ({ date, close, ticker })
const rates = { usd: [], macro: [] }

it('uma divergência futura não apaga o histórico válido anterior ao lançamento afetado', () => {
  const points = historicalReturns([position()], [trade('2026-01-02'), { ...trade('2026-01-04'), ticker: 'BBB' }], [price('2026-01-02'), price('2026-01-03', 110), price('2026-01-04', 110), price('2026-01-04', 100, 'BBB')], [], rates, '2026-01-04')
  expect(points[0].returnPct).toBe(0)
  expect(points[1].returnPct).toBeCloseTo(0.1)
  expect(points[2].returnPct).toBeNull()
})

it('não transforma aporte em ganho: saldo dez vezes maior tem retorno zero com preço estável', () => {
  const points = historicalReturns([position('AAA', 10)], [trade('2026-01-02'), trade('2026-01-03', 9)], [price('2026-01-02'), price('2026-01-03')], [], rates, '2026-01-03')
  expect(points.map(p => p.value)).toEqual([100, 1000])
  expect(points.map(p => p.returnPct)).toEqual([0, 0])
})

it('reconstrói venda total e preserva ganho realizado mesmo sem posição atual', () => {
  const points = historicalReturns([], [trade('2026-01-02'), trade('2026-01-03', 1, 'sell', 110)], [price('2026-01-02'), price('2026-01-03', 110)], [], rates, '2026-01-03')
  expect(points[1].value).toBe(0)
  expect(points[1].returnPct).toBeCloseTo(0.1)
})

it('compra de outro ativo não é ganho e não retroage sua quantidade', () => {
  const points = historicalReturns([position(), { ...position('BBB'), acquisition_date: '2026-01-03' }], [], [price('2026-01-02'), price('2026-01-02', 100, 'BBB'), price('2026-01-03')], [], rates, '2026-01-03')
  expect(points.map(p => p.value)).toEqual([100, 200])
  expect(points[1].returnPct).toBe(0)
})

it('carrega apenas preço anterior recente entre calendários, sem somar uma carteira parcial', () => {
  const points = historicalReturns([position(), position('BBB')], [], [price('2026-01-02'), price('2026-01-02', 100, 'BBB'), price('2026-01-03', 110)], [], rates, '2026-01-03')
  expect(points[1].value).toBe(210)
  expect(points[1].returnPct).toBeCloseTo(0.05)
})

it('falta de histórico inicial não vira salto quando a cotação aparece', () => {
  const points = historicalReturns([position(), position('BBB')], [], [price('2026-01-02'), price('2026-01-03', 100, 'BBB')], [], rates, '2026-01-04')
  expect(points[0].value).toBeNull()
  expect(points[1].value).toBe(200)
  expect(points[1].returnPct).toBeNull()
  expect(summarizeHistoricalReturns(points, '2026-01-02', '2026-02-01').returnPct).toBeNull()
})

it('não usa câmbio atual ou futuro para completar posição USD', () => {
  const points = historicalReturns([position('AAA', 1, 'USD')], [], [price('2026-01-02')], [], { usd: [{ date: '2026-01-03', value: 5 }], macro: [] }, '2026-01-03')
  expect(points[0].value).toBeNull()
  expect(points[1].value).toBe(500)
  expect(points[1].returnPct).toBeNull()
})

it('taxas de compra e venda reduzem retorno, sem serem apagadas pelos fluxos', () => {
  const points = historicalReturns([], [{ ...trade('2026-01-02'), brokerage_fee: 1 }, { ...trade('2026-01-03', 1, 'sell'), brokerage_fee: 1 }], [price('2026-01-02'), price('2026-01-03')], [], rates, '2026-01-03')
  expect(points[0].returnPct).toBeCloseTo(100 / 101 - 1)
  expect(points[1].returnPct).toBeCloseTo(-0.01)
})

it('razão divergente do saldo atual não recebe abertura inventada', () => {
  const points = historicalReturns([position('AAA', 2)], [trade('2026-01-02')], [price('2026-01-02')], [], rates, '2026-01-02')
  expect(points[0].returnPct).toBeNull()
})

it('renda fixa sem movimentos usa principal como entrada e cupom/resgate como saída', () => {
  const fixed = [{ principal: 100, application_date: '2026-01-02', indexer: 'pre', rate: 0,
    events: [{ event_date: '2026-01-03', seq: 1, amount: 105, principal_redeemed: 100, balance_after: 0 }],
  }] as HistoricalFixedIncome[]
  const points = historicalReturns([], [], [], fixed, rates, '2026-01-03')
  expect(points[0].returnPct).toBe(0)
  expect(points[1].returnPct).toBeCloseTo(0.05)
})

it('lacunas invalidam acumulado, e períodos novos não herdam lacuna antiga', () => {
  const points = [{ date: '2026-01-02', value: null, returnPct: null }, { date: '2026-02-02', value: 100, returnPct: 0.1 }]
  const total = summarizeHistoricalReturns(points, '2026-01-01', '2026-03-01')
  expect(total.monthly.has('2026-01')).toBe(false)
  expect(total.returnPct).toBeNull()
  expect(summarizeHistoricalReturns(points, '2026-02-01', '2026-03-01').returnPct).toBeCloseTo(0.1)
})

it('inclui provento apenas no pagamento e converte a renda USD pelo câmbio histórico', () => {
  const income = [{ ticker: 'AAA', payment_date: '2026-01-03', total_value: 1, currency: 'USD' }] as DividendRow[]
  const points = historicalReturns([position()], [], [price('2026-01-02'), price('2026-01-03')], [], { usd: [{ date: '2026-01-02', value: 5 }], macro: [] }, '2026-01-03', income)
  expect(points[0].returnPct).toBe(0)
  expect(points[1].returnPct).toBeCloseTo(0.05)
})

it('não perpetua preço antigo para esconder uma lacuna longa', () => {
  const points = historicalReturns([position()], [], [price('2026-01-02')], [], rates, '2026-01-20')
  expect(points[points.length - 1].value).toBeNull()
  expect(points[points.length - 1].returnPct).toBeNull()
})

it('par BRL com preço vencido usa USD recente com câmbio histórico e identifica falha sem câmbio', () => {
  const p = { ...position('BTC-BRL'), acquisition_date: '2026-01-20', average_price: 500 }
  const prices = [price('2026-01-01', 450, 'BTC-BRL'), price('2026-01-20', 100, 'BTC')]
  const points = historicalReturns([p], [], prices, [], { usd: [{ date: '2026-01-20', value: 5 }], macro: [] }, '2026-01-20')
  expect(points[0].value).toBe(500)
  expect(points[0].returnPct).toBe(0)
  const missing = historicalReturns([p], [], prices, [], rates, '2026-01-20')
  expect(missing[0].value).toBeNull()
  expect(missing[0].issues).toContain('Preço histórico indisponível: BTC-BRL')
})

it('explica divergência do razão sem inventar movimento para completar saldo', () => {
  const points = historicalReturns([position('AAA', 2)], [trade('2026-01-02')], [price('2026-01-02')], [], rates, '2026-01-02')
  expect(summarizeHistoricalReturns(points, '2026-01-01', '2026-02-01').issues).toContain('Movimentações divergentes da posição: AAA')
})
