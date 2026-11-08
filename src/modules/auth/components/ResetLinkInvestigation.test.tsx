import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ResetPasswordForm } from './ResetPasswordForm'
import { isRejectedRecoveryReturn } from '../recoveryReturn'
const state = vi.hoisted(() => ({ loading: false, isAuthenticated: true, reset: vi.fn() }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => state }))
vi.mock('../services/authService', () => ({ authService: { resetPassword: state.reset, logout: async () => { state.isAuthenticated = false } } }))
afterEach(() => vi.useRealTimers())
beforeEach(() => { state.loading = false; state.isAuthenticated = true; state.reset.mockReset().mockResolvedValue(undefined) })
function show(path = '/reset-password') {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[path]}><ResetPasswordForm /></MemoryRouter></QueryClientProvider>)
}
it.each(['#error=access_denied&error_code=otp_expired&error_description=private', '?error_code=otp_expired'])('bloqueia retorno rejeitado mesmo com sessão anterior: %s', suffix => {
  show('/reset-password' + suffix)
  expect(screen.getByRole('alert')).toHaveTextContent('Link expirado ou inválido')
  expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  expect(screen.queryByText('private')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute('href', '/recuperar-senha')
  expect(state.reset).not.toHaveBeenCalled()
})
it('aguarda inicialização sem mostrar campos e bloqueia ausência de sessão', () => {
  state.loading = true; show()
  expect(screen.getByRole('status')).toHaveTextContent('Verificando')
  expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
})
it('sem sessão orienta novo pedido imediatamente', () => {
  state.isAuthenticated = false; show()
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
})
it('mantém formulário com sessão e encaminha senha ao serviço', async () => {
  state.reset.mockRejectedValue(new Error('same_password'))
  show()
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Teste123!@' } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Teste123!@' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('diferente')
  expect(state.reset).toHaveBeenCalledWith('Teste123!@', expect.anything())
})
it('não trata type=recovery como autorização nem guarda descrições/tokens', () => {
  expect(isRejectedRecoveryReturn('/reset-password', '', '#type=recovery')).toBe(false)
  expect(isRejectedRecoveryReturn('/login', '?error=denied', '')).toBe(false)
})
it('mantém confirmação de sucesso quando o logout remove a sessão após salvar', async () => {
  vi.useFakeTimers()
  show()
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Teste123!@' } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Teste123!@' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    await vi.advanceTimersByTimeAsync(10)
  })
  expect(screen.getByRole('status')).toHaveTextContent('Senha redefinida com sucesso')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
})
