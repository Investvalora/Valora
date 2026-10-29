import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginForm } from './LoginForm'
import { authService } from '../services/authService'

vi.mock('../services/authService', () => ({ authService: { login: vi.fn(), loginWithGoogle: vi.fn(), resendConfirmation: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
function show(url = '/login') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><MemoryRouter initialEntries={[url]}><LoginForm /></MemoryRouter></QueryClientProvider>)
}
it('permite iniciar Google e informa falha sem bloquear outra tentativa', async () => {
  vi.mocked(authService.loginWithGoogle).mockRejectedValue(new Error('provider disabled'))
  show()
  await userEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar com Google')
  expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
})
it.each(['/login?error=access_denied', '/login#error=access_denied&error_description=secret'])('informa cancelamento no retorno %s', (url) => {
  show(url)
  expect(screen.getByRole('alert')).toHaveTextContent('cancelado')
  expect(screen.getByRole('alert')).not.toHaveTextContent('secret')
})
it('informa falha no retorno OAuth', () => {
  show('/login?error=server_error')
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir')
})

it('oferece reenvio ao bloquear email não confirmado sem liberar sessão', async () => {
  vi.mocked(authService.login).mockRejectedValue(new Error('Email not confirmed'))
  show()
  await userEvent.type(screen.getByLabelText('Email'), 'pendente@valora.test')
  await userEvent.type(screen.getByLabelText('Senha'), 'MinhaSenha!82')
  await userEvent.click(screen.getByRole('button', { name: /^Entrar$/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirme seu email')
  expect(screen.getByRole('button', { name: 'Reenviar email de confirmação' })).toBeEnabled()
  expect(authService.resendConfirmation).not.toHaveBeenCalled()
})
