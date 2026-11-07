import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn() }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { auth: mocks } }))
beforeEach(() => vi.clearAllMocks())

it('limpa dados de outra identidade e preserva cache no refresh da mesma sessão', async () => {
  let change: (event: string, session: unknown) => void = () => {}
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'a' } } } })
  mocks.onAuthStateChange.mockImplementation(callback => { change = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><AuthProvider><div>app</div></AuthProvider></QueryClientProvider>)
  await waitFor(() => expect(mocks.getSession).toHaveBeenCalled())
  client.setQueryData(['private', 'a'], 'private-data')
  act(() => change('TOKEN_REFRESHED', { user: { id: 'a' } }))
  expect(client.getQueryData(['private', 'a'])).toBe('private-data')
  act(() => change('SIGNED_IN', { user: { id: 'b' } }))
  expect(client.getQueryData(['private', 'a'])).toBeUndefined()
  client.setQueryData(['private', 'b'], 'private-data-b')
  act(() => change('SIGNED_OUT', null))
  expect(client.getQueryCache().getAll()).toHaveLength(0)
})

it('não restaura sessão antiga quando getSession termina após o evento de saída', async () => {
  let resolve: (value: unknown) => void = () => {}
  let change: (event: string, session: unknown) => void = () => {}
  mocks.getSession.mockReturnValue(new Promise(done => { resolve = done }))
  mocks.onAuthStateChange.mockImplementation(callback => { change = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><AuthProvider>app</AuthProvider></QueryClientProvider>)
  act(() => change('SIGNED_OUT', null))
  client.setQueryData(['public'], 'current')
  await act(async () => resolve({ data: { session: { user: { id: 'stale' } } } }))
  expect(client.getQueryData(['public'])).toBe('current')
})
