import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AssetCatalogSearch } from './AssetCatalogSearch'

const search = vi.hoisted(() => vi.fn())
const retry = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: search }))
beforeEach(() => {
  retry.mockReset()
  search.mockImplementation((term: string) => ({ data: term === 'Apple' ? [{ ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' }] : [], isFetching: false, isError: false, refetch: retry }))
})
function show() {
  render(<MemoryRouter initialEntries={['/ativos']}><Routes>
    <Route path="/ativos" element={<AssetCatalogSearch />} />
    <Route path="/ativo/AAPL" element={<h1>Resumo de AAPL</h1>} />
  </Routes></MemoryRouter>)
}

it('consulta ativo fora da carteira e abre seu resumo sem formulário de compra', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativos no catálogo' }))
  await user.type(screen.getByLabelText('Ticker ou nome do ativo'), 'Apple')
  const result = await screen.findByRole('link', { name: /AAPL Apple Inc Stocks US · USD/ })
  expect(result).toHaveAttribute('href', '/ativo/AAPL')
  await user.click(result)
  expect(screen.getByRole('heading', { name: 'Resumo de AAPL' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('não mostra resultado anterior durante nova busca e informa ausência de correspondência', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativos no catálogo' }))
  const input = screen.getByLabelText('Ticker ou nome do ativo')
  await user.type(input, 'Apple')
  await screen.findByRole('link', { name: /AAPL/ })
  await user.clear(input)
  expect(screen.queryByRole('link', { name: /AAPL/ })).not.toBeInTheDocument()
  await user.type(input, 'ZZZZ')
  expect(screen.queryByRole('link', { name: /AAPL/ })).not.toBeInTheDocument()
  expect(await screen.findByText(/Nenhum ativo encontrado no catálogo/)).toBeInTheDocument()
})

it('oferece nova tentativa e limpa a consulta ao fechar', async () => {
  search.mockReturnValue({ data: [], isFetching: false, isError: true, refetch: retry })
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativos no catálogo' }))
  await user.type(screen.getByLabelText('Ticker ou nome do ativo'), 'Apple')
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar os ativos.')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retry).toHaveBeenCalledOnce()
  await user.click(screen.getByRole('button', { name: /^Fechar$/ }))
  await user.click(screen.getByRole('button', { name: 'Buscar ativos no catálogo' }))
  await waitFor(() => expect(screen.getByLabelText('Ticker ou nome do ativo')).toHaveValue(''))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
