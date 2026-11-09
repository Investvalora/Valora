import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AssetCatalogSearch } from './AssetCatalogSearch'

const search = vi.hoisted(() => vi.fn())
const retry = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: search }))
beforeEach(() => {
  retry.mockReset()
  search.mockImplementation((term: string) => ({ data: term === 'Apple' ? [{ ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' }] : [], isFetching: false, isError: false, refetch: retry }))
})

function SearchHarness() {
  const [open, setOpen] = useState(false)
  return <AssetCatalogSearch open={open} onOpenChange={setOpen} />
}
function ResultsLocation() {
  const location = useLocation()
  return <p>Resultados: {location.search}</p>
}
function show() {
  render(<MemoryRouter initialEntries={['/ativos']}><Routes>
    <Route path="/ativos" element={<SearchHarness />} />
    <Route path="/ativos/explorar" element={<ResultsLocation />} />
    <Route path="/ativos/explorar/AAPL" element={<h1>Resumo de AAPL</h1>} />
  </Routes></MemoryRouter>)
}

it('expande a busca e abre o resumo de uma sugestão', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativo no catálogo' }))
  await user.type(screen.getByRole('searchbox', { name: 'Buscar ativo por nome ou ticker' }), 'Apple')
  const result = await screen.findByRole('link', { name: /AAPL Apple Inc Stocks US/ })
  expect(result).toHaveAttribute('href', '/ativos/explorar/AAPL?q=Apple')
  await user.click(result)
  expect(screen.getByRole('heading', { name: 'Resumo de AAPL' })).toBeInTheDocument()
})

it('Enter abre a página de resultados com a consulta na URL', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativo no catálogo' }))
  await user.type(screen.getByRole('searchbox'), 'Apple{Enter}')
  expect(screen.getByText('Resultados: ?q=Apple')).toBeInTheDocument()
})

it('não mostra sugestões anteriores durante outra busca e permite fechar', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativo no catálogo' }))
  const input = screen.getByRole('searchbox')
  await user.type(input, 'Apple')
  await screen.findByRole('link', { name: /AAPL/ })
  await user.clear(input)
  expect(screen.queryByRole('link', { name: /AAPL/ })).not.toBeInTheDocument()
  await user.type(input, 'ZZZZ')
  expect(screen.queryByRole('link', { name: /AAPL/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Fechar busca' }))
  expect(screen.getByRole('button', { name: 'Buscar ativo no catálogo' })).toBeInTheDocument()
})

it('oferece nova tentativa em erro', async () => {
  search.mockReturnValue({ data: [], isFetching: false, isError: true, refetch: retry })
  const user = userEvent.setup()
  show()
  await user.click(screen.getByRole('button', { name: 'Buscar ativo no catálogo' }))
  await user.type(screen.getByRole('searchbox'), 'Apple')
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar os ativos.')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retry).toHaveBeenCalledOnce()
})
