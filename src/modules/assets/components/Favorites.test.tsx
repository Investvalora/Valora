import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { FavoriteButton } from './FavoriteButton'
import { FavoritesList } from './FavoritesList'

const mocks = vi.hoisted(() => ({ list: vi.fn(), set: vi.fn(), user: { id: 'owner' } }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('../services/favoritesService', () => ({ favoritesService: { list: mocks.list, set: mocks.set } }))
const apple = { ticker: 'AAPL', asset: { name: 'Apple Inc', type: 'stock_us', currency: 'USD' } }
beforeEach(() => { mocks.list.mockReset().mockResolvedValue([]); mocks.set.mockReset().mockResolvedValue(undefined) })
function show(child = <FavoriteButton ticker="AAPL" />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route path="/" element={child} /><Route path="/ativo/AAPL" element={<h1>Resumo Apple</h1>} /></Routes></MemoryRouter></QueryClientProvider>)
  return client
}
it('persiste por conta, atualiza estado só após sucesso e permite remover', async () => {
  const user = userEvent.setup()
  show()
  const add = await screen.findByRole('button', { name: 'Adicionar AAPL aos favoritos' })
  await waitFor(() => expect(add).toBeEnabled())
  mocks.list.mockResolvedValue([apple])
  await user.click(add)
  expect(mocks.set).toHaveBeenCalledWith('owner', 'AAPL', true)
  const remove = await screen.findByRole('button', { name: 'Remover AAPL dos favoritos' })
  expect(remove).toHaveAttribute('aria-pressed', 'true')
  mocks.list.mockResolvedValue([])
  await user.click(remove)
  await waitFor(() => expect(mocks.set).toHaveBeenLastCalledWith('owner', 'AAPL', false))
  await screen.findByRole('button', { name: 'Adicionar AAPL aos favoritos' })
})
it('mantém favorito se a remoção falhar e permite nova tentativa', async () => {
  mocks.list.mockResolvedValue([apple]); mocks.set.mockRejectedValueOnce(new Error('private error'))
  show()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Remover AAPL dos favoritos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível alterar')
  expect(screen.getByRole('button', { name: 'Remover AAPL dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  mocks.list.mockResolvedValue([])
  await user.click(screen.getByRole('button', { name: 'Remover AAPL dos favoritos' }))
  await screen.findByRole('button', { name: 'Adicionar AAPL aos favoritos' })
})
it('lista nome, classe e moeda e abre resumo sem criar posição', async () => {
  mocks.list.mockResolvedValue([apple]); show(<FavoritesList />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Abrir favoritos' }))
  await user.click(await screen.findByRole('link', { name: 'AAPL Apple Inc Stocks US · USD' }))
  expect(await screen.findByRole('heading', { name: 'Resumo Apple' })).toBeInTheDocument()
  expect(mocks.set).not.toHaveBeenCalled()
})
it('mostra estado vazio e orientação para adicionar', async () => {
  show(<FavoritesList />)
  await userEvent.click(screen.getByRole('button', { name: 'Abrir favoritos' }))
  expect(await screen.findByText(/Nenhum favorito ainda/)).toBeInTheDocument()
})
it('não confunde falha de carregamento com lista vazia', async () => {
  mocks.list.mockRejectedValueOnce(new Error('offline')); show(<FavoritesList />)
  await userEvent.click(screen.getByRole('button', { name: 'Abrir favoritos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  expect(screen.queryByText(/Nenhum favorito ainda/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText(/Nenhum favorito ainda/)).toBeInTheDocument()
})
