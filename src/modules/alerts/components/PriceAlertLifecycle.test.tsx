import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { PriceAlertLifecycle } from './PriceAlertLifecycle'
import type { Alert } from '../types'
const calls = vi.hoisted(() => ({ pause: vi.fn(), remove: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u' } }) }))
vi.mock('../services/alertsService', () => ({ alertsService: { setPriceAlertPaused: calls.pause, deletePriceAlert: calls.remove } }))
const alert = { id: 'a', user_id: 'u', ticker: 'ITUB4', type: 'price_target', paused: false } as Alert
beforeEach(() => { calls.pause.mockReset().mockResolvedValue(undefined); calls.remove.mockReset().mockResolvedValue(undefined) })
function show(value = alert) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><PriceAlertLifecycle alert={value} /></QueryClientProvider>) }
it('pauses and resumes without deleting the price rule', async () => {
  const view = show()
  fireEvent.click(screen.getByRole('button', { name: 'Pausar alerta de ITUB4' }))
  await waitFor(() => expect(calls.pause).toHaveBeenCalledWith('u', 'a', true))
  view.unmount(); show({ ...alert, paused: true })
  fireEvent.click(screen.getByRole('button', { name: 'Retomar alerta de ITUB4' }))
  await waitFor(() => expect(calls.pause).toHaveBeenCalledWith('u', 'a', false))
  expect(calls.remove).not.toHaveBeenCalled()
})
it('requires explicit confirmation to delete and allows cancellation', async () => {
  show(); fireEvent.click(screen.getByRole('button', { name: 'Excluir alerta de ITUB4' }))
  expect(calls.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Excluir alerta de ITUB4' }))
  fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  await waitFor(() => expect(calls.remove).toHaveBeenCalledWith('u', 'a'))
})
it('does not write for a different owner and shows failure', async () => {
  show({ ...alert, user_id: 'other' })
  fireEvent.click(screen.getByRole('button', { name: 'Pausar alerta de ITUB4' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível')
  expect(calls.pause).not.toHaveBeenCalled()
})
