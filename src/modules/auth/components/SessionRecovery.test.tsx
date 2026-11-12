import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SessionRecovery } from './SessionRecovery'
import { isRevokedSession } from '../sessionRecovery'
import { useAuthStore } from '../store'

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { auth: mocks } }))
beforeEach(() => {
  mocks.getUser.mockReset()
  useAuthStore.setState({ session: { access_token: 'test', user: { id: 'a' } } as never })
})
afterEach(() => { vi.useRealTimers(); useAuthStore.setState({ session: null }) })
it('classifica apenas códigos explícitos, não indisponibilidade ou mensagem genérica', () => {
  expect(isRevokedSession({ code: 'session_not_found' })).toBe(true)
  expect(isRevokedSession({ status: 503 })).toBe(false)
  expect(isRevokedSession(new Error('session_not_found'))).toBe(false)
})
it('mantém formulário montado e orienta reautenticação sem fazer logout', async () => {
  mocks.getUser.mockResolvedValue({ error: { code: 'session_not_found' } })
  render(<MemoryRouter><input aria-label="rascunho" defaultValue="não perder" /><SessionRecovery /></MemoryRouter>)
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  expect(screen.getByLabelText('rascunho')).toHaveValue('não perder')
  expect(screen.getByText('Entrar em outra aba')).toHaveAttribute('href', '/login?reauth=1')
  mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: 'a' } } })
  fireEvent.click(screen.getByText('Já entrei; verificar'))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByLabelText('rascunho')).toHaveValue('não perder')
})
it('uma falha de rede permite nova tentativa sem invalidar a sessão', async () => {
  mocks.getUser.mockRejectedValue(new TypeError('Failed to fetch'))
  render(<MemoryRouter><SessionRecovery /></MemoryRouter>)
  expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível verificar')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useAuthStore.getState().session).not.toBeNull()
})
it('mantém a revogação durante nova tentativa e falha de rede até validar a mesma conta', async () => {
  mocks.getUser.mockResolvedValueOnce({ error: { code: 'session_not_found' } })
  render(<MemoryRouter><input aria-label="rascunho" defaultValue="preservar"/><SessionRecovery /></MemoryRouter>)
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  let resolve!: (value: unknown) => void
  mocks.getUser.mockReturnValueOnce(new Promise(done => { resolve = done }))
  fireEvent.click(screen.getByText('Já entrei; verificar'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await act(async () => resolve({ error: { status: 503 } }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Não foi possível verificar o novo login')
  mocks.getUser.mockResolvedValueOnce({ error: null, data: { user: { id: 'a' } } })
  fireEvent.click(screen.getByText('Já entrei; verificar'))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByLabelText('rascunho')).toHaveValue('preservar')
})
it.each([null, { id: 'outra-conta' }])('não libera a recuperação com usuário ausente ou incompatível: %s', async user => {
  mocks.getUser.mockResolvedValueOnce({ error: { code: 'session_not_found' } })
  render(<MemoryRouter><SessionRecovery /></MemoryRouter>)
  await screen.findByRole('dialog')
  mocks.getUser.mockResolvedValueOnce({ error: null, data: { user } })
  fireEvent.click(screen.getByText('Já entrei; verificar'))
  expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível verificar o novo login')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
it('descarta resposta da sessão antiga após troca de identidade', async () => {
  let resolve!: (value: unknown) => void
  mocks.getUser.mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValue({ error: null, data: { user: { id: 'a' } } })
  render(<MemoryRouter><SessionRecovery /></MemoryRouter>)
  act(() => useAuthStore.setState({ session: { access_token: 'other', user: { id: 'b' } } as never }))
  await act(async () => resolve({ error: { code: 'session_not_found' } }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('oferece nova tentativa após timeout sem logout e ignora a resposta tardia', async () => {
  vi.useFakeTimers()
  let resolve!: (value: unknown) => void
  mocks.getUser.mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValue({ error: null, data: { user: { id: 'a' } } })
  render(<MemoryRouter><input aria-label="rascunho" defaultValue="preservar"/><SessionRecovery /></MemoryRouter>)
  await act(async () => vi.advanceTimersByTimeAsync(15_000))
  expect(screen.getByRole('status')).toHaveTextContent('Não foi possível verificar')
  expect(useAuthStore.getState().session).not.toBeNull()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await act(async () => resolve({ error: { code: 'session_not_found' } }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('rascunho')).toHaveValue('preservar')
})
