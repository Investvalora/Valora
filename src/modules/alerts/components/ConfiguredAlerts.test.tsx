import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConfiguredAlerts } from './ConfiguredAlerts'

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), setEnabled: vi.fn(), remove: vi.fn(), getQuote: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u' } }) }))
vi.mock('../services/configuredAlertsService', () => ({ configuredAlertsService: mocks }))
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: [{ ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' }] }) }))
vi.mock('../services/alertQuoteService', () => ({ alertQuoteService: { getQuote: mocks.getQuote, resolveAsset: async () => ({ ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' }) } }))
const rule = { id: 'r', user_id: 'u', ticker: 'PETR4', kind: 'indicator', metric: 'dy', operator: 'gte', threshold: 6, enabled: true }
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue([]); mocks.save.mockResolvedValue(undefined); mocks.setEnabled.mockResolvedValue(undefined) })
function page() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ConfiguredAlerts /></QueryClientProvider>) }
it('cria regra por seleção do catálogo sem consultar preço e permite corrigir falha', async () => {
  page()
  fireEvent.click(screen.getByRole('button', { name: 'Nova regra de alerta' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByRole('combobox', { name: 'Ativo (ticker)' }), { target: { value: 'PETR4' } })
  fireEvent.click(within(await dialog.findByRole('listbox')).getByRole('option'))
  fireEvent.change(dialog.getByLabelText('Valor de referência'), { target: { value: '6,5' } })
  mocks.save.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(dialog.getByRole('button', { name: 'Salvar regra' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  fireEvent.click(dialog.getByRole('button', { name: 'Salvar regra' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(mocks.save).toHaveBeenLastCalledWith('u', { ticker: 'PETR4', kind: 'indicator', metric: 'dy', operator: 'gte', threshold: 6.5 }, undefined)
  expect(mocks.getQuote).not.toHaveBeenCalled()
})
it('edita condição existente e pausa sem alterar os avisos recebidos', async () => {
  mocks.list.mockResolvedValue([rule]); page()
  fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }))
  await waitFor(() => expect(mocks.setEnabled).toHaveBeenCalledWith('u', 'r', false))
  fireEvent.click(screen.getByRole('button', { name: 'Editar regra' }))
  const dialog = within(screen.getByRole('dialog'))
  await waitFor(() => expect(dialog.getByLabelText('Ativo (ticker)')).toHaveValue('PETR4'))
  fireEvent.change(dialog.getByLabelText('Valor de referência'), { target: { value: '8' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Salvar regra' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('u', expect.objectContaining({ threshold: 8 }), 'r'))
})
it('cria evento sem enviar condição numérica residual', async () => {
  page(); fireEvent.click(screen.getByRole('button', { name: 'Nova regra de alerta' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('Ativo (ticker)'), { target: { value: 'PETR4' } })
  fireEvent.click(within(await dialog.findByRole('listbox')).getByRole('option'))
  fireEvent.change(dialog.getByLabelText('Tipo de acompanhamento'), { target: { value: 'dividend_payment' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Salvar regra' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('u', { ticker: 'PETR4', kind: 'dividend_payment', metric: null, operator: null, threshold: null }, undefined))
})
