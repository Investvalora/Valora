import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Asset } from '../types'
import { toIsoDate } from '../../../shared/utils/isoDate'
import { positionService } from '../services/positionService'

afterEach(() => vi.restoreAllMocks())

const mocks = vi.hoisted(() => ({ save: vi.fn(async () => ({})), suggestions: [] as Asset[], prices: {} as Record<string, number>, latest: vi.fn() }))
beforeEach(() => {
  sessionStorage.clear()
  mocks.save.mockClear()
  mocks.suggestions = []
  mocks.prices = {}
  mocks.latest.mockReset().mockImplementation((ticker: string) => mocks.prices[ticker] ?? null)
})
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'draft-owner' } }) }))
const usd: Asset = { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD' }
const brl: Asset = { ...usd, ticker: 'BTC-BRL', currency: 'BRL' }
vi.mock('../hooks/useTransactions', () => ({ useAddTransaction: () => ({ mutateAsync: mocks.save, isPending: false }) }))
vi.mock('../hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../hooks/usePositions', () => ({ usePositions: () => ({ data: [] }) }))
vi.mock('../hooks/useCalcFixedIncome', () => ({ useCalcFixedIncome: () => ({ calc: vi.fn() }) }))
vi.mock('../hooks/useFixedIncomePositions', () => ({ useAddFixedIncomePosition: () => ({ isPending: false }) }))
vi.mock('../hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: mocks.suggestions }), useTickerLatestPrice: mocks.latest }))
vi.mock('../services/positionService', () => ({
  normalizeTickers: (tickers: string[]) => tickers,
  positionService: {
    findAssetByTicker: async (ticker: string) => ticker === 'BTC-BRL' ? brl : usd,
    listLatestQuotes: async (): Promise<import('../types').LatestQuote[]> => [],
    previousClose: async (): Promise<number | null> => null,
  },
}))
import { QuickTransactionModal } from './QuickTransactionModal'
import { draftKey, readDraft, saveDraft } from '../../../shared/utils/sessionDraft'

it('restaura campos sem salvar nem substituir preço e descarta ao cancelar', async () => {
  const key = draftKey('draft-owner','wallet','transaction:new')
  saveDraft(key,{ assetClass: 'crypto', type: 'buy', values: { ticker: 'BTC',date: '2026-01-02',quantity: '2',price: '10' } })
  mocks.prices.BTC = 99
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.click(await screen.findByRole('button',{name:'Restaurar rascunho'}))
  expect(screen.getByLabelText('Quantidade')).toHaveValue(2)
  expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue(10)
  expect(mocks.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}))
  expect(readDraft(key)).toBeNull()
})

it('abre o atalho com o ativo preenchido e preserva um rascunho do formulário anterior', async () => {
  const asset: Asset = { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' }
  const legacyKey = draftKey('draft-owner', 'wallet', 'detail-transaction:AAPL')
  saveDraft(legacyKey, {
    type: 'buy', transaction_date: '2026-01-02', quantity: '3', price: '120', brokerage_fee: '1',
  })
  mocks.prices.AAPL = 150
  render(<QueryClientProvider client={new QueryClient()}>
    <QuickTransactionModal isOpen initialAsset={asset} onClose={vi.fn()} />
  </QueryClientProvider>)
  expect(screen.getByRole('dialog', { name: 'Adicionar Lançamento' })).toHaveClass('transaction-drawer-panel')
  expect(screen.getByLabelText('Ativo')).toHaveValue('AAPL')
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('stock_us')
  expect(screen.getByLabelText('Data da transação')).toHaveValue('')
  expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue(150)

  fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Quantidade')).toHaveValue(3)
  expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue(120)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(readDraft(legacyKey)).toBeNull()
})

it('mostra nome/classe/moeda e só preenche preço após selecionar; trocar a busca limpa cotação anterior', async () => {
  vi.spyOn(positionService, 'findAssetByTicker').mockResolvedValue(null)
  mocks.suggestions = [{ ticker: 'GOOGL', name: 'Alphabet Inc Class A', type: 'stock_us', currency: 'USD' }]
  mocks.prices.GOOGL = 277.47
  vi.spyOn(positionService, 'listLatestQuotes').mockResolvedValue([
    { ticker: 'GOOGL', close: 277.47, date: '2026-11-11', source: 'test', updated_at: '2026-11-11T21:00:00Z' },
  ])
  vi.spyOn(positionService, 'previousClose').mockResolvedValue(275.51)
  const { rerender } = render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'GOOGLE' } })
  const suggestion = await screen.findByRole('button', { name: 'GOOGL Alphabet Inc Class A Stocks US · USD' })
  expect(suggestion.closest('#qt-asset-options')).toHaveClass('absolute', 'transaction-asset-options')
  expect(screen.queryByText(/no último fechamento/)).not.toBeInTheDocument()
  expect(screen.getByLabelText('Preço unitário (BRL)')).toHaveValue(null)
  expect(mocks.latest.mock.calls.every(([ticker]) => ticker === '')).toBe(true)
  fireEvent.click(suggestion)
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('stock_us')
  await waitFor(() => expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue(277.47))
  expect(screen.getByText('Alphabet Inc Class A · USD').parentElement).toHaveClass('absolute', 'transaction-asset-confirmation')
  expect(document.getElementById('qt-asset-options')).toBeNull()
  expect(await screen.findByText('+0,71% no último fechamento')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Preço unitário (USD)'), { target: { value: '300' } })
  mocks.prices.GOOGL = 280
  rerender(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue(300)
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'FAST' } })
  expect(screen.getByLabelText('Preço unitário (BRL)')).toHaveValue(null)
  expect(mocks.latest).not.toHaveBeenCalledWith('FAST')
  expect(screen.queryByText('Alphabet Inc Class A · USD')).not.toBeInTheDocument()
  expect(screen.queryByText(/no último fechamento/)).not.toBeInTheDocument()
})

it('não transforma preço vazio em compra a preço zero', () => {
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'RADL3' } })
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Data da transação'), { target: { value: toIsoDate(new Date()) } })
  fireEvent.submit(document.getElementById('quick-transaction-form')!)
  expect(screen.getByText('Preencha ativo, data, quantidade e preço válidos.')).toBeInTheDocument()
  expect(mocks.save).not.toHaveBeenCalled()
})

it('sugere ativos de classes diferentes e preenche o tipo selecionado', async () => {
  vi.spyOn(positionService, 'findAssetByTicker').mockResolvedValue(null)
  mocks.suggestions = [
    { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
    { ticker: 'AAPL34', name: 'Apple BDR', type: 'bdr', currency: 'BRL' },
  ]
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Tipo de ativo'), { target: { value: 'fii' } })
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'Apple' } })
  expect(await screen.findByRole('button', { name: /AAPL Apple Inc/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /AAPL34 Apple BDR/ }))
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('bdr')
  expect(screen.getByLabelText('Ativo')).toHaveValue('AAPL34')
})

it('exige data, ajusta a quantidade e apresenta o total líquido na venda', () => {
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByLabelText('Data da transação')).toHaveValue('')
  const plus = screen.getByRole('button', { name: 'Aumentar quantidade' })
  const minus = screen.getByRole('button', { name: 'Diminuir quantidade' })
  expect(minus).toBeDisabled()
  fireEvent.click(plus)
  fireEvent.click(plus)
  fireEvent.click(minus)
  expect(screen.getByLabelText('Quantidade')).toHaveValue(1)
  fireEvent.change(screen.getByLabelText('Preço unitário (BRL)'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText(/Outros custos/), { target: { value: '2' } })
  expect(screen.getByRole('status')).toHaveTextContent(/12,00/)
  fireEvent.click(screen.getByRole('button', { name: 'Venda' }))
  expect(screen.getByRole('button', { name: 'Venda' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('status')).toHaveTextContent(/8,00/)
  fireEvent.click(screen.getByRole('button', { name: 'Salvar venda' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Informe uma data válida')
  expect(mocks.save).not.toHaveBeenCalled()
})

it.each(['stock_br', 'fixed_income', 'tesouro_direto'])('recusa data futura antes de salvar %s', (category) => {
  mocks.save.mockClear()
  const close = vi.fn()
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={close} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Tipo de ativo'), { target: { value: category } })
  fireEvent.change(screen.getByLabelText('Data da transação'), { target: { value: '2999-12-31' } })
  fireEvent.submit(document.getElementById('quick-transaction-form')!)
  expect(screen.getByText('Informe uma data válida, até hoje.')).toBeInTheDocument()
  expect(mocks.save).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
})

it('mantém data e quantidade na mesma linha e as ações dentro do formulário rolável', () => {
  render(<QueryClientProvider client={new QueryClient()}>
    <QuickTransactionModal isOpen onClose={vi.fn()} />
  </QueryClientProvider>)

  const dialog = screen.getByRole('dialog', { name: 'Adicionar Lançamento' })
  const date = screen.getByLabelText('Data da transação')
  expect(dialog).toHaveClass('transaction-modal-panel', 'transaction-drawer-panel')
  expect(dialog.parentElement).toHaveClass('transaction-modal-overlay')
  const row = date.closest('.grid')
  expect(row).toHaveClass('grid-cols-2')
  expect(row).toContainElement(screen.getByLabelText('Quantidade'))
  expect(date).toHaveClass('text-base')
  const form = date.closest('form')
  expect(dialog.lastElementChild).toHaveClass('overflow-y-auto')
  expect(dialog.lastElementChild).toContainElement(form)
  expect(form?.lastElementChild).toContainElement(screen.getByRole('button', { name: 'Salvar compra' }))
  expect(form?.lastElementChild).toContainElement(screen.getByRole('status'))
})

it('abre novo aporte com o produto selecionado sem copiar valor nem data da aplicação antiga', () => {
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} initialFixedIncome={{ name: 'RDB Nubank', type: 'rdb_cdi', rate: 115 }} /></QueryClientProvider>)
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('fixed_income')
  expect(screen.getByLabelText('Emissor')).toHaveValue('RDB Nubank')
  expect(screen.getByLabelText('Tipo de título')).toHaveValue('rdb_cdi')
  expect(screen.getByLabelText('% do CDI (ex: 110)')).toHaveValue(115)
  expect(screen.getByLabelText('Valor (R$)')).toHaveValue(null)
})

it('escolhe BRL para cripto e salva quantidade fracionária, preço e custos sem conversão', async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <QuickTransactionModal isOpen onClose={vi.fn()} />
  </QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Tipo de ativo'), { target: { value: 'crypto' } })
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'BTC' } })
  await waitFor(() => expect(screen.getByLabelText('Moeda do lançamento')).toHaveValue('USD'))
  fireEvent.change(screen.getByLabelText('Moeda do lançamento'), { target: { value: 'BRL' } })
  await waitFor(() => expect(screen.getByLabelText('Ativo')).toHaveValue('BTC-BRL'))
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '0.00061788' } })
  fireEvent.change(screen.getByLabelText('Preço unitário (BRL)'), { target: { value: '363489.14' } })
  fireEvent.change(document.getElementById('qt-other-costs')!, { target: { value: '1.23' } })
  expect(screen.getByLabelText('Quantidade')).toHaveAttribute('step', 'any')
  fireEvent.change(screen.getByLabelText('Data da transação'), { target: { value: toIsoDate(new Date()) } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar compra' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
    ticker: 'BTC-BRL', quantity: 0.00061788, price: 363489.14, brokerage_fee: 1.23,
  })))
})
