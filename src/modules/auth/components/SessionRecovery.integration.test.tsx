import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { SessionRecovery } from './SessionRecovery'
import { useAuthStore } from '../store'
import { draftKey, readDraft, saveDraft } from '../../../shared/utils/sessionDraft'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn() }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { auth: mocks } }))
let authEvent: (event: string, session: unknown) => void
const session = (id: string, token: string) => ({ user: { id }, access_token: token })
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  useAuthStore.setState({ session: null, user: null, loading: true })
  mocks.getSession.mockResolvedValue({ data: { session: session('a', 'old') } })
  mocks.onAuthStateChange.mockImplementation(callback => { authEvent = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
})
afterEach(() => { vi.useRealTimers(); useAuthStore.setState({ session: null, user: null }) })
function mount() {
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><MemoryRouter><AuthProvider><input aria-label="formulário aberto" defaultValue="preservar"/><SessionRecovery/></AuthProvider></MemoryRouter></QueryClientProvider>)
  return client
}
it('evento de novo login da mesma conta recupera a tela e preserva formulário, cache e rascunho', async () => {
  mocks.getUser.mockImplementation(async token => ({ error: token === 'old' ? { code: 'session_not_found' } : null }))
  const client = mount()
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  const key = draftKey('a', 'wallet', 'form')
  saveDraft(key, 'meu rascunho'); client.setQueryData(['private', 'a'], 'cache')
  act(() => authEvent('SIGNED_IN', session('a', 'new')))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(mocks.getUser).toHaveBeenLastCalledWith('new')
  expect(screen.getByLabelText('formulário aberto')).toHaveValue('preservar')
  expect(readDraft(key)).toBe('meu rascunho')
  expect(client.getQueryData(['private', 'a'])).toBe('cache')
})
it('troca de conta limpa cache e rascunhos anteriores antes de aceitar a nova identidade', async () => {
  mocks.getUser.mockResolvedValue({ error: null })
  const client = mount()
  await waitFor(() => expect(useAuthStore.getState().user?.id).toBe('a'))
  const key = draftKey('a', 'wallet', 'form')
  saveDraft(key, 'privado'); client.setQueryData(['private', 'a'], 'privado')
  act(() => authEvent('SIGNED_IN', session('b', 'new')))
  expect(readDraft(key)).toBeNull()
  expect(client.getQueryData(['private', 'a'])).toBeUndefined()
  expect(useAuthStore.getState().user?.id).toBe('b')
})
