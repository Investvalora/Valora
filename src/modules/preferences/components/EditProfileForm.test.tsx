import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { EditProfileForm } from './EditProfileForm'
import { authService } from '../../auth/services/authService'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u', email: 'antigo@valora.test' } }) }))
vi.mock('../../auth/services/authService', () => ({ authService: { updateProfile: vi.fn(), requestEmailChange: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
function show() {
  render(<QueryClientProvider client={new QueryClient()}><EditProfileForm fullName="Ana Maria" phone="11999999999" email="antigo@valora.test" /></QueryClientProvider>)
}
it('salva nome normalizado e remoção do telefone', async () => {
  vi.mocked(authService.updateProfile).mockResolvedValue({ id: 'u', user_metadata: { full_name: 'Ana  Silva', phone: null } } as never)
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Editar dados pessoais' }))
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: ' Ana  Silva ' } })
  fireEvent.change(screen.getByLabelText('Telefone (opcional)'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar dados' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Dados pessoais atualizados')
  expect(authService.updateProfile).toHaveBeenCalledWith({ fullName: 'Ana  Silva', phone: '' })
})
it('rejeita telefone inválido sem enviar e permite cancelar', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Editar dados pessoais' }))
  fireEvent.change(screen.getByLabelText('Telefone (opcional)'), { target: { value: 'abc' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar dados' }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(authService.updateProfile).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument()
})
it('mantém a troca de email pendente e mostra falha sem afirmar sucesso', async () => {
  vi.mocked(authService.requestEmailChange).mockRejectedValueOnce(new Error('rate limit')).mockResolvedValueOnce({ id: 'u', email: 'antigo@valora.test', new_email: 'novo@valora.test' } as never)
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Alterar email' }))
  fireEvent.change(screen.getByLabelText('Novo email'), { target: { value: 'novo@valora.test' } })
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar troca de email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível solicitar')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar troca de email' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar troca de email' }))
  expect(await screen.findByRole('status')).toHaveTextContent('O endereço atual continua válido')
})
