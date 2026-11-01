import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AtivoDetailPage } from './AtivoDetailPage'
import { valueAssets } from '../../ativos/assetValuation'
import type { FixedIncomePosition, LatestQuote, PositionWithAsset } from '../../portfolio/types'

const assetDetail = vi.hoisted(() => vi.fn())
const transactions = vi.hoisted(() => vi.fn())
const history = vi.hoisted(() => vi.fn())
const create = vi.hoisted(() => vi.fn())
const valuation = vi.hoisted(() => vi.fn())
const received = vi.hoisted(() => vi.fn())
const marketDividends = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: [] }) }))
vi.mock('../../alerts/services/alertQuoteService', () => ({ alertQuoteService: { resolveAsset: async () => null } }))
beforeEach(() => {
  assetDetail.mockReturnValue({ data: { ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' } })
  transactions.mockReturnValue({ data: [] })
})
beforeEach(() => marketDividends.mockReturnValue({ data: [] }))
beforeEach(() => received.mockReturnValue({ rows: [], isLoading: false, isError: false }))
vi.mock('../../dividends/hooks/useDividends', () => ({ useDividends: () => received() }))
beforeEach(() => valuation.mockReturnValue({ positions: [], rows: [], isLoading: false, isError: false }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'w1' } }) }))
vi.mock('../../ativos/hooks/useAtivosValuation', () => ({ useAtivosValuation: (...args: unknown[]) => valuation(...args) }))
vi.mock('../hooks/useDailyChange', () => ({ useDailyChange: () => -2.5 }))
vi.mock('../hooks/useAssetDetail', () => ({ useAssetDetail: () => assetDetail() }))
vi.mock('../hooks/usePriceHistory', () => ({ usePriceHistory: (...args: unknown[]) => { history(...args); return { data: [] } } }))
vi.mock('../hooks/useAssetDividends', () => ({ useAssetDividends: () => marketDividends() }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [] }) }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [{ ticker: 'PETR4', close: 20 }] }) }))
vi.mock('../../portfolio/hooks/useDividendTotals', () => ({ useDividendTotals: () => new Map() }))
vi.mock('../../portfolio/hooks/useTransactions', () => ({ useAllTransactions: () => transactions() }))
vi.mock('../../score/hooks/useFundamentals', () => ({ useFundamentals: () => ({ data: [] }) }))
vi.mock('../../score/hooks/useScoreRules', () => ({ useScoreRules: () => ({ data: [] }) }))
vi.mock('../../score/hooks/useScorePreferences', () => ({ useScorePreferences: () => ({ data: null }) }))
vi.mock('../../score/hooks/useCalculateScore', () => ({ useCalculateScore: () => new Map() }))
vi.mock('../../valuation/hooks/useBazin', () => ({ useBazin: () => ({ bazinByTicker: new Map() }) }))
vi.mock('../../alerts/hooks/useAlerts', () => ({ useAlerts: () => ({ data: [] }) }))
vi.mock('../../alerts/hooks/useAlertMutations', () => ({ useCreatePriceTargetAlert: () => ({ mutateAsync: create, isPending: false }) }))
vi.mock('../../performance/hooks/usePerformance', () => ({ usePerformance: () => ({ summary: { cdiReturnPct: 0.1 } }) }))
vi.mock('../../portfolio/components/AddTransactionModal', () => ({ AddTransactionModal: ({ isOpen, ticker, assetName, assetType, onClose }: { isOpen: boolean; ticker: string; assetName: string; assetType: string; onClose: () => void }) => isOpen ? <div role="dialog" aria-label="Lançamento"><p>{ticker} {assetName} {assetType}</p><button onClick={onClose}>Cancelar lançamento</button></div> : null }))

it('abre lançamento preenchido e cria alerta com o ticker do detalhe, permitindo corrigir uma falha', async () => {
  create.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({})
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/ativos/PETR4']}><Routes><Route path="/ativos/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: '+ Lançamento do ativo' }))
  expect(within(screen.getByRole('dialog', { name: 'Lançamento' })).getByText('PETR4 Petrobras stock_br')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar lançamento' }))
  await user.click(screen.getByRole('button', { name: 'Criar alerta' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Criar alerta' }))
  expect(dialog.getByLabelText('Ativo (ticker)')).toHaveValue('PETR4')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(create).not.toHaveBeenCalled()
  await user.type(dialog.getByRole('spinbutton'), '25')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('Erro ao criar alerta')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(create).toHaveBeenLastCalledWith({ ticker: 'PETR4', targetPrice: 25, condition: 'below' })
  expect(screen.queryByRole('dialog', { name: 'Criar alerta' })).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Alertas' })).toHaveAttribute('aria-selected', 'true')
})

it('mostra recebimentos históricos elegíveis e preserva o histórico público separado', async () => {
  marketDividends.mockReturnValue({ data: [{ ticker: 'PETR4', ex_date: '2025-12-15', payment_date: '2025-12-30', type: 'dividend', value_per_share: 1 }] })
  received.mockReturnValue({ rows: [
    { ticker: 'PETR4', ex_date: '2026-01-05', payment_date: '2026-01-15', quantity: 3, value_per_share: 1, total_value: 3, currency: 'BRL' },
    { ticker: 'PETR4', ex_date: '2026-02-05', payment_date: '2026-02-15', quantity: 10, value_per_share: 0.33, total_value: 3.29, currency: 'BRL', source: 'imported' },
    { ticker: 'OUTRO', payment_date: '2026-02-15', quantity: 100, value_per_share: 1, total_value: 100 },
  ], isLoading: false, isError: false })
  render(<MemoryRouter initialEntries={['/ativo/PETR4']}><Routes><Route path="/ativo/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  expect(screen.getByText('15/01/2026')).toBeInTheDocument()
  expect(screen.getByText('15/02/2026')).toBeInTheDocument()
  expect(screen.getByText(/× 3$/)).toBeInTheDocument()
  expect(screen.getByText('Líquido importado')).toBeInTheDocument()
  expect(screen.getByText(/= R\$\s*3,29/)).toBeInTheDocument()
  expect(screen.queryByText(/= R\$\s*100,00/)).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: /^Proventos$/ }))
  expect(screen.getByRole('columnheader', { name: 'Quantidade histórica' })).toBeInTheDocument()
  expect(screen.getByText(/3,29/)).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Histórico do ativo' }))
  expect(screen.getByText('15/12/2025')).toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Total recebido' })).not.toBeInTheDocument()
})

it('mostra peso sobre BRL, USD e renda fixa da carteira selecionada e separa variação diária do custo', async () => {
  const positions = [
    { id: 'a', ticker: 'PETR4', quantity: 10, average_price: 10, asset: { currency: 'BRL', type: 'stock_br' } },
    { id: 'b', ticker: 'AAPL', quantity: 1, average_price: 20, asset: { currency: 'USD', type: 'stock_us' } },
  ] as PositionWithAsset[]
  const valued = valueAssets(positions, [{ ticker: 'PETR4', close: 20 }, { ticker: 'AAPL', close: 20 }] as LatestQuote[], [{ name: 'CDB', principal: 100, current_value: 100 }] as FixedIncomePosition[], 5)
  valuation.mockReturnValue({ ...valued, positions, isLoading: false, isError: false })
  render(<MemoryRouter initialEntries={['/ativo/PETR4']}><Routes><Route path="/ativo/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  expect(valuation).toHaveBeenCalledWith('w1', true)
  expect(screen.getByText('+50,00%')).toBeInTheDocument()
  expect(screen.getByText('-2,50% no último fechamento')).toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Rentab.' }))
  expect(screen.getByText('+90,00 p.p.')).toBeInTheDocument()
})

it('seleciona cinco anos sem substituir Tudo', async () => {
  render(<MemoryRouter initialEntries={['/ativo/PETR4']}><Routes><Route path="/ativo/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '5A' }))
  expect(history).toHaveBeenLastCalledWith('PETR4', '5A')
  await user.click(screen.getByRole('button', { name: 'Tudo' }))
  expect(history).toHaveBeenLastCalledWith('PETR4', 'Tudo')
})

it.each([
  ['USD', '$51.91', '$103.82'],
  ['BRL', 'R$ 51,91', 'R$ 103,82'],
])('preserva valores e moeda %s na previa e aba de lancamentos', async (currency, price, total) => {
  assetDetail.mockReturnValue({ data: { ticker: 'PETR4', name: 'Ativo de teste', type: currency === 'USD' ? 'stock_us' : 'stock_br', currency } })
  transactions.mockReturnValue({ data: [{ id: 'txn', ticker: 'PETR4', type: 'buy', quantity: 2, price: 51.91, transaction_date: '2026-10-30' }] })
  render(<MemoryRouter initialEntries={['/ativo/PETR4']}><Routes><Route path="/ativo/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  expect(screen.getByText(total)).toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Lançam.' }))
  expect(within(screen.getByRole('table')).getByText(price)).toBeInTheDocument()
  expect(within(screen.getByRole('table')).getByText(total)).toBeInTheDocument()
})
