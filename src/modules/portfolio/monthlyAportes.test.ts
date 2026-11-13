import { expect, it } from 'vitest'
import { buildMonthlyAportes, type AporteAsset } from './monthlyAportes'
import type { Transaction } from './services/transactionsService'

const assets = new Map<string, AporteAsset>([
  ['AAPL', { type: 'stock_us', currency: 'USD' }],
  ['PETR4', { type: 'stock_br', currency: 'BRL' }],
  ['BTC', { type: 'crypto', currency: 'USD' }],
  ['BTC-BRL', { type: 'crypto', currency: 'BRL' }],
])
const trade = (ticker: string, date: string, type: Transaction['type'] = 'buy', quantity = 2, price = 10) => ({ ticker, transaction_date: date, type, quantity, price }) as Transaction

it('converte cada compra/venda USD pela taxa histórica e soma BRL sem conversão', () => {
  const trades = [trade('AAPL', '2026-10-01'), trade('AAPL', '2026-10-02', 'sell'), trade('PETR4', '2026-10-02')]
  const original = structuredClone(trades)
  expect(buildMonthlyAportes(trades, assets, 'all', [{ date: '2026-10-01', value: 5 }, { date: '2026-10-02', value: 6 }, { date: '2026-11-01', value: 9 }]))
    .toEqual([{ month: '2026-10', compras: 120, vendas: 120, incomplete: 0 }])
  expect(trades).toEqual(original)
})
it('usa a última publicação anterior no fim de semana, sem antecipar câmbio futuro', () => {
  expect(buildMonthlyAportes([trade('AAPL', '2026-10-04')], assets, 'all', [{ date: '2026-10-02', value: 5 }, { date: '2026-10-05', value: 6 }])[0].compras).toBe(100)
})
it('não apresenta mês incompleto como total parcial ou zero e preserva outros meses', () => {
  const data = buildMonthlyAportes([trade('PETR4', '2026-10-02'), trade('AAPL', '2026-10-02'), trade('PETR4', '2026-10-03'), trade('PETR4', '2026-11-02')], assets)
  expect(data).toEqual([{ month: '2026-10', compras: null, vendas: null, incomplete: 1 }, { month: '2026-11', compras: 20, vendas: 0, incomplete: 0 }])
})
it('não presume BRL para ativo desconhecido nem usa câmbio obsoleto', () => {
  expect(buildMonthlyAportes([trade('UNKNOWN', '2026-10-20')], assets)[0].compras).toBeNull()
  expect(buildMonthlyAportes([trade('AAPL', '2026-10-20')], assets, 'all', [{ date: '2026-10-01', value: 5 }])[0].compras).toBeNull()
})
it('respeita tipo e moeda do catálogo para cripto USD/BRL e ignora proventos', () => {
  const data = buildMonthlyAportes([trade('BTC', '2026-10-02'), trade('BTC-BRL', '2026-10-02'), trade('AAPL', '2026-10-02'), trade('BTC', '2026-10-02', 'dividend')], assets, 'crypto', [{ date: '2026-10-02', value: 5 }])
  expect(data).toEqual([{ month: '2026-10', compras: 120, vendas: 0, incomplete: 0 }])
})
