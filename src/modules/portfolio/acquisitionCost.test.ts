import { expect, it } from 'vitest'
import { acquisitionCostBRL, type CostTransaction } from './acquisitionCost'
import type { PositionWithAsset } from './types'
const position = (overrides = {}) => ({ id: 'p', wallet_id: 'w', ticker: 'US', quantity: 10, average_price: 10, acquisition_date: '2026-09-01', asset: { currency: 'USD' }, ...overrides }) as PositionWithAsset
const buy = (overrides = {}): CostTransaction => ({ wallet_id: 'w', ticker: 'US', type: 'buy', quantity: 10, price: 10, seq: 1, transaction_date: '2026-09-01', ...overrides })
const rates = [{ date: '2026-09-01', value: 5 }, { date: '2026-10-01', value: 6 }]
it('mantém o custo das compras nas respectivas taxas, inclui despesas e reduz proporcionalmente na venda', () => {
  const trades = [buy({ brokerage_fee: 1, tax: 1 }), buy({ transaction_date: '2026-10-01', seq: 2, price: 20 }), buy({ type: 'sell', transaction_date: '2026-10-02', seq: 3, quantity: 5, price: 999, brokerage_fee: 999 })]
  expect(acquisitionCostBRL(position({ quantity: 15, average_price: 15.1 }), trades, rates)).toBeCloseTo((102 * 5 + 200 * 6) * 0.75)
  expect(acquisitionCostBRL(position({ quantity: 15, average_price: 15.1 }), trades, [...rates, { date: '2026-11-10', value: 999 }])).toBeCloseTo(1282.5)
})
it('isola carteiras, ignora dividendos e não confunde a cotação de venda com custo', () => {
  expect(acquisitionCostBRL(position(), [buy(), buy({ wallet_id: 'other', price: 999 }), buy({ type: 'dividend', quantity: 999 })], rates)).toBe(500)
})
it('usa referência da aquisição no saldo inicial e nunca câmbio futuro', () => {
  expect(acquisitionCostBRL(position(), [], rates)).toBe(500)
  expect(acquisitionCostBRL(position(), [], rates.slice(1))).toBeNull()
  expect(acquisitionCostBRL(position(), [], [{ date: '2026-08-01', value: 5 }])).toBeNull()
})
it('não transforma histórico parcial ou incompatível em custo completo', () => {
  expect(acquisitionCostBRL(position(), [buy({ quantity: 5 })], rates)).toBeNull()
  expect(acquisitionCostBRL(position(), [buy({ price: 11 })], rates)).toBeNull()
  expect(acquisitionCostBRL(position(), [buy()], [])).toBeNull()
})
it('encerra o custo ao zerar e permite reentrada mesmo com câmbio ausente no ciclo anterior', () => {
  const trades = [buy({ transaction_date: '2026-08-01' }), buy({ type: 'sell', seq: 2, transaction_date: '2026-08-02' }), buy({ transaction_date: '2026-10-01', seq: 3 })]
  expect(acquisitionCostBRL(position(), trades, rates)).toBe(600)
})
it('preserva custo em BRL e pares cripto BRL sem reconversão', () => {
  expect(acquisitionCostBRL(position({ asset: { currency: 'BRL', type: 'crypto' } }), [], [])).toBe(100)
})
it('usa custo exato dos lançamentos BRL em vez de multiplicar o preço médio arredondado', () => {
  const p = position({ quantity: 300, average_price: 0.3333, asset: { currency: 'BRL' } })
  expect(acquisitionCostBRL(p, [buy({ quantity: 300, price: 1 / 3 })], [])).toBeCloseTo(100)
  expect(Number(p.quantity) * Number(p.average_price)).toBeCloseTo(99.99)
})
