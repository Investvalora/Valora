import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { PriceAlertForm } from './PriceAlertForm'

const mocks = vi.hoisted(() => ({ getQuote: vi.fn(), resolveAsset: vi.fn(), create: vi.fn() }))
const fund = { ticker: 'MXRF11', name: 'Maxi Renda',type: 'fii',currency: 'BRL' }
const stock = { ticker: 'AAPL', name: 'Apple Inc',type: 'stock_us',currency: 'USD' }
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: (term: string) => ({ data: term.toUpperCase().startsWith('MX') ? [fund] : term.toUpperCase().startsWith('AA') ? [stock] : [] }) }))
vi.mock('../services/alertQuoteService', () => ({ alertQuoteService: mocks }))
vi.mock('../hooks/useAlertMutations', () => ({ useCreatePriceTargetAlert: () => ({ mutateAsync: mocks.create,isPending: false }) }))
beforeEach(() => {
  mocks.getQuote.mockReset().mockResolvedValue({ price: 8.9,date: '2026-10-30' })
  mocks.resolveAsset.mockReset().mockResolvedValue(fund)
  mocks.create.mockReset().mockResolvedValue({})
})
async function choose(user: ReturnType<typeof userEvent.setup>, term = 'MX') {
  const input = screen.getByRole('combobox')
  await user.clear(input)
  await user.type(input,term)
  const option = await screen.findByRole('option', { name: term === 'AA' ? /AAPL Apple Inc/ : /MXRF11 Maxi Renda/ })
  await user.click(option)
}

it('busca cotação apenas ao selecionar; preenche uma vez e preserva preço manual em foco e rerender', async () => {
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await user.type(screen.getByRole('combobox'),'MX')
  await screen.findByRole('option')
  expect(mocks.getQuote).not.toHaveBeenCalled()
  await user.click(screen.getByRole('option'))
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
  await user.clear(screen.getByRole('spinbutton'))
  await user.type(screen.getByRole('spinbutton'),'7.5')
  await user.click(screen.getByRole('radio',{name:'Acima de'}))
  fireEvent(window,new Event('focus'))
  expect(screen.getByRole('spinbutton')).toHaveValue(7.5)
  expect(mocks.getQuote).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button',{name:'Criar alerta'}))
  expect(mocks.create).toHaveBeenCalledWith({ticker:'MXRF11',targetPrice:7.5,condition:'above'})
})

it('atualiza a cotação somente pelo botão e não refaz ao selecionar o mesmo ativo', async () => {
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await choose(user)
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option'))
  expect(mocks.getQuote).toHaveBeenCalledTimes(1)
  mocks.getQuote.mockResolvedValueOnce({price:9.2})
  await user.click(screen.getByRole('button',{name:'Atualizar cotação'}))
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(9.2))
  expect(mocks.getQuote).toHaveBeenCalledTimes(2)
})

it('resposta atrasada não sobrescreve preço digitado durante a busca', async () => {
  let resolve!: (value: {price:number}) => void
  mocks.getQuote.mockReturnValueOnce(new Promise(done => { resolve=done }))
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await choose(user)
  await user.type(screen.getByRole('spinbutton'),'7.5')
  await act(async () => resolve({price:8.9}))
  expect(screen.getByRole('spinbutton')).toHaveValue(7.5)
})

it('ignora cotação atrasada de outro ativo e mantém moeda da seleção atual', async () => {
  let resolve!: (value: {price:number}) => void
  mocks.getQuote.mockReturnValueOnce(new Promise(done => { resolve=done })).mockResolvedValueOnce({price:300})
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await choose(user)
  await choose(user,'AA')
  await waitFor(() => expect(screen.getByLabelText('Preço-alvo (US$)')).toHaveValue(300))
  await act(async () => resolve({price:8.9}))
  expect(screen.getByLabelText('Preço-alvo (US$)')).toHaveValue(300)
  expect(screen.getByRole('combobox')).toHaveValue('AAPL')
})

it('cotação inicial pelo detalhe carrega uma vez e permite atualização manual', async () => {
  const user = userEvent.setup()
  render(<PriceAlertForm initialTicker="MXRF11" onClose={vi.fn()} />)
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
  expect(mocks.resolveAsset).toHaveBeenCalledWith('MXRF11')
  await user.clear(screen.getByRole('spinbutton'))
  await user.type(screen.getByRole('spinbutton'),'8')
  expect(mocks.getQuote).toHaveBeenCalledOnce()
  expect(screen.getByRole('spinbutton')).toHaveValue(8)
})

it('falha na atualização preserva preço-alvo e permite nova tentativa', async () => {
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await choose(user)
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
  await user.clear(screen.getByRole('spinbutton'))
  await user.type(screen.getByRole('spinbutton'),'7')
  mocks.getQuote.mockRejectedValueOnce(new Error('internal secret'))
  await user.click(screen.getByRole('button',{name:'Atualizar cotação'}))
  expect(await screen.findByText(/Seu preço-alvo foi mantido/)).toBeInTheDocument()
  expect(screen.queryByText(/internal secret/)).not.toBeInTheDocument()
  expect(screen.getByRole('spinbutton')).toHaveValue(7)
  await user.click(screen.getByRole('button',{name:'Atualizar cotação'}))
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
})

it('consulta inicial atrasada também preserva o preço já digitado', async () => {
  let resolve!: (value: typeof fund) => void
  mocks.resolveAsset.mockReturnValueOnce(new Promise(done => { resolve=done }))
  const user = userEvent.setup()
  render(<PriceAlertForm initialTicker="MXRF11" onClose={vi.fn()} />)
  await user.type(screen.getByRole('spinbutton'),'7')
  await act(async () => resolve(fund))
  await waitFor(() => expect(mocks.getQuote).toHaveBeenCalledOnce())
  expect(await screen.findByText(/Última cotação disponível/)).toBeInTheDocument()
  expect(screen.getByRole('spinbutton')).toHaveValue(7)
})

it('seleciona pelo teclado sem enviar o formulário', async () => {
  const user = userEvent.setup()
  render(<PriceAlertForm onClose={vi.fn()} />)
  await user.type(screen.getByRole('combobox'),'MX')
  await screen.findByRole('option')
  await user.keyboard('{ArrowDown}{Enter}')
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(8.9))
  expect(screen.getByRole('spinbutton')).toHaveFocus()
  expect(mocks.create).not.toHaveBeenCalled()
})
