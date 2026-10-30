import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Asset } from '../types'
import { positionService } from '../services/positionService'

afterEach(() => vi.restoreAllMocks())

const mocks = vi.hoisted(() => ({ save: vi.fn(async () => ({})), suggestions: [] as Asset[], prices: {} as Record<string, number>, latest: vi.fn() }))
beforeEach(() => {
  mocks.save.mockClear()
  mocks.suggestions = []
  mocks.prices = {}
  mocks.latest.mockReset().mockImplementation((ticker: string) => mocks.prices[ticker] ?? null)
})
const usd: Asset = { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD' }
const brl: Asset = { ...usd, ticker: 'BTC-BRL', currency: 'BRL' }
vi.mock('../hooks/useTransactions', () => ({ useAddTransaction: () => ({ mutateAsync: mocks.save, isPending: false }) }))
vi.mock('../hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../hooks/usePositions', () => ({ usePositions: () => ({ data: [] }) }))
vi.mock('../hooks/useCalcFixedIncome', () => ({ useCalcFixedIncome: () => ({ calc: vi.fn() }) }))
vi.mock('../hooks/useFixedIncomePositions', () => ({ useAddFixedIncomePosition: () => ({ isPending: false }) }))
vi.mock('../hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: mocks.suggestions }), useTickerLatestPrice: mocks.latest }))
vi.mock('../services/positionService', () => ({ positionService: { findAssetByTicker: async (ticker: string) => ticker === 'BTC-BRL' ? brl : usd } }))
import { QuickTransactionModal } from './QuickTransactionModal'

it('mostra nome/classe/moeda e só preenche preço após selecionar; trocar a busca limpa cotação anterior', async () => {
  vi.spyOn(positionService, 'findAssetByTicker').mockResolvedValue(null)
  mocks.suggestions = [{ ticker: 'GOOGL', name: 'Alphabet Inc Class A', type: 'stock_us', currency: 'USD' }]
  mocks.prices.GOOGL = 277.47
  const { rerender } = render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Tipo de ativo'), { target: { value: 'stock_us' } })
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'GOOGLE' } })
  const suggestion = await screen.findByRole('button', { name: 'GOOGL Alphabet Inc Class A Stocks US · USD' })
  expect(screen.getByLabelText('Preço (USD)')).toHaveValue(null)
  expect(mocks.latest.mock.calls.every(([ticker]) => ticker === '')).toBe(true)
  fireEvent.click(suggestion)
  expect(screen.getByLabelText('Tipo de ativo')).toHaveValue('stock_us')
  await waitFor(() => expect(screen.getByLabelText('Preço (USD)')).toHaveValue(277.47))
  expect(screen.getByText('Alphabet Inc Class A · GOOGL · USD')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Preço (USD)'), { target: { value: '300' } })
  mocks.prices.GOOGL = 280
  rerender(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByLabelText('Preço (USD)')).toHaveValue(300)
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'FAST' } })
  expect(screen.getByLabelText('Preço (USD)')).toHaveValue(null)
  expect(mocks.latest).not.toHaveBeenCalledWith('FAST')
  expect(screen.queryByText('Alphabet Inc Class A · GOOGL · USD')).not.toBeInTheDocument()
})

it('não transforma preço vazio em compra a preço zero', () => {
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'RADL3' } })
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } })
  fireEvent.submit(document.getElementById('quick-transaction-form')!)
  expect(screen.getByText('Preencha ativo, data, quantidade e preço válidos.')).toBeInTheDocument()
  expect(mocks.save).not.toHaveBeenCalled()
})

it.each([
  ['stock_br', 'BTC', { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD' }],
  ['etf_br', 'MXRF11', { ticker: 'MXRF11', name: 'Maxi Renda', type: 'fii', currency: 'BRL' }],
])('filtra sugestoes e bloqueia salvar ativo de outra classe em %s', async (category, ticker, asset) => {
  vi.spyOn(positionService, 'findAssetByTicker').mockResolvedValue(asset as Asset)
  mocks.suggestions = [asset as Asset]
  render(<QueryClientProvider client={new QueryClient()}><QuickTransactionModal isOpen onClose={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Tipo de ativo'), { target: { value: category } })
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: ticker } })
  await screen.findByText('Este ativo pertence a outro tipo. Altere o tipo de ativo para continuar.')
  expect(screen.queryByRole('button', { name: new RegExp(asset.name) })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Preço (BRL)')).toHaveValue(null)
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Preço (BRL)'), { target: { value: '10' } })
  fireEvent.submit(document.getElementById('quick-transaction-form')!)
  await waitFor(() => expect(screen.getAllByText('Este ativo pertence a outro tipo. Altere o tipo de ativo para continuar.').length).toBeGreaterThan(0))
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

it('abre como painel inferior e organiza os campos em uma coluna no celular', () => {
  render(<QueryClientProvider client={new QueryClient()}>
    <QuickTransactionModal isOpen onClose={vi.fn()} />
  </QueryClientProvider>)

  const dialog = screen.getByRole('dialog', { name: 'Adicionar Lançamento' })
  const date = screen.getByLabelText('Data da transação')
  expect(dialog).toHaveClass('transaction-modal-panel')
  expect(dialog.parentElement).toHaveClass('transaction-modal-overlay')
  expect(date.closest('.grid')).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
  expect(date).toHaveClass('text-base')
  const footer = screen.getByRole('button', { name: 'Salvar' }).parentElement?.parentElement
  expect(footer).toBe(dialog.lastElementChild)
  expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('form', 'quick-transaction-form')
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
  fireEvent.change(screen.getByLabelText('Preço (BRL)'), { target: { value: '363489.14' } })
  fireEvent.change(document.getElementById('qt-other-costs')!, { target: { value: '1.23' } })
  expect(screen.getByLabelText('Quantidade')).toHaveAttribute('step', 'any')
  fireEvent.click(screen.getByRole('button', { name: /^Salvar$/ }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
    ticker: 'BTC-BRL', quantity: 0.00061788, price: 363489.14, brokerage_fee: 1.23,
  })))
})
