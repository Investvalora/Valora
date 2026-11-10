import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PasswordRecoveryForm } from './PasswordRecoveryForm'
import { ResetPasswordForm } from './ResetPasswordForm'

const fixture = vi.hoisted(() => ({ mobile: false, recover: vi.fn(), reset: vi.fn() }))
vi.mock('../../../shared/hooks/useIsMobile', () => ({ useIsMobile: () => fixture.mobile }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ loading: false, isAuthenticated: true }) }))
vi.mock('../services/authService', () => ({ authService: {
  requestPasswordRecovery: fixture.recover, resetPassword: fixture.reset,
} }))

beforeEach(() => {
  fixture.mobile = false
  vi.resetAllMocks()
})

function show(reset = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter>
    {reset ? <ResetPasswordForm /> : <PasswordRecoveryForm />}
  </MemoryRouter></QueryClientProvider>)
}

it.each([false, true])('recuperação mobile=%s trata falha de rede e permite nova tentativa sem perder email', async mobile => {
  fixture.mobile = mobile
  fixture.recover.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce(undefined)
  show()
  const email = screen.getByLabelText(/email/i)
  fireEvent.change(email, { target: { value: 'teste@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar instruções' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Verifique sua conexão')
  expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  expect(email).toHaveValue('teste@example.com')
  fireEvent.click(screen.getByRole('button', { name: 'Enviar instruções' }))
  await waitFor(() => expect(fixture.recover).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
})

it('redefinição sem sessão orienta em português e mantém o pedido de novo link', async () => {
  fixture.reset.mockRejectedValueOnce(new Error('Auth session missing!'))
  show(true)
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Teste123!@' } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Teste123!@' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Link expirado ou inválido')
  expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute('href', '/recuperar-senha')
  expect(screen.queryByText('Auth session missing!')).not.toBeInTheDocument()
})
