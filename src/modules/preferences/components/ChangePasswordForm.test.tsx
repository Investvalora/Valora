import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChangePasswordForm } from './ChangePasswordForm'
import { authService } from '../../auth/services/authService'
vi.mock('../../auth/services/authService', () => ({ authService: { changePassword: vi.fn(), requestPasswordChangeCode: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
function fill(password = 'Vento!Nuvem82', confirmation = password) {
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
}
it('valida confirmação e política antes de chamar o servidor', () => {
  render(<ChangePasswordForm />)
  fill('Vento!Nuvem82', 'outra')
  expect(screen.getByRole('alert')).toHaveTextContent('não coincidem')
  expect(authService.changePassword).not.toHaveBeenCalled()
})
it('salva, limpa os campos e informa sucesso', async () => {
  vi.mocked(authService.changePassword).mockResolvedValue(undefined)
  render(<ChangePasswordForm />)
  fill()
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha alterada'))
  expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
})
it('suporta reautenticação exigida pelo servidor e erro de código', async () => {
  vi.mocked(authService.changePassword).mockRejectedValueOnce({ code: 'reauthentication_needed' }).mockRejectedValueOnce({ code: 'reauthentication_not_valid' })
  vi.mocked(authService.requestPasswordChangeCode).mockResolvedValue(undefined)
  render(<ChangePasswordForm />)
  fill()
  await screen.findByLabelText('Código de confirmação')
  fireEvent.click(screen.getByRole('button', { name: 'Enviar novo código por email' }))
  await screen.findByRole('status')
  fireEvent.change(screen.getByLabelText('Código de confirmação'), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('inválido ou expirado'))
  expect(authService.changePassword).toHaveBeenLastCalledWith('Vento!Nuvem82', '123456')
})
