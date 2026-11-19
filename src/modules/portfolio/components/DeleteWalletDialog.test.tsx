import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { DeleteWalletDialog } from './DeleteWalletDialog'

const deletion = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }))
vi.mock('../hooks/useWallets', () => ({ useDeleteWallet: () => deletion }))
const wallet = { id: 'secondary', user_id: 'owner', name: 'Viagem', color: 'green' as const, is_default: false, created_at: '' }
beforeEach(() => { deletion.mutateAsync.mockReset().mockResolvedValue(undefined); deletion.isPending = false })

it('exige nome exato e só exclui a carteira confirmada', async () => {
  const close = vi.fn()
  const user = userEvent.setup()
  render(<DeleteWalletDialog wallet={wallet} selected onClose={close} />)
  expect(screen.getByText('1 de 2 · Confira a carteira')).toBeInTheDocument()
  expect(screen.getByText('Selecionada')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(deletion.mutateAsync).not.toHaveBeenCalled()
  expect(screen.getByText('2 de 2 · Confirme a exclusão')).toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Excluir definitivamente' })
  expect(button).toBeDisabled()
  expect(screen.getByRole('textbox')).toHaveFocus()
  await user.type(screen.getByRole('textbox'), 'viagem')
  expect(button).toBeDisabled()
  await user.clear(screen.getByRole('textbox'))
  await user.type(screen.getByLabelText('Digite o nome da carteira para confirmar'), 'Viagem')
  await user.click(button)
  expect(deletion.mutateAsync).toHaveBeenCalledWith({ walletId: 'secondary', confirmationName: 'Viagem' })
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})

it('cancelar não apaga nada e a carteira principal fica bloqueada mesmo com nome correto', async () => {
  const close = vi.fn()
  const user = userEvent.setup()
  render(<DeleteWalletDialog wallet={{ ...wallet, is_default: true }} onClose={close} />)
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(close).toHaveBeenCalledOnce()
  expect(deletion.mutateAsync).not.toHaveBeenCalled()
})

it('mantém confirmação após erro sem expor detalhes internos e permite nova tentativa', async () => {
  const close = vi.fn()
  deletion.mutateAsync.mockRejectedValueOnce(new Error('database secret detail'))
  const user = userEvent.setup()
  render(<DeleteWalletDialog wallet={wallet} onClose={close} />)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByRole('textbox'), 'Viagem')
  await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a exclusão')
  expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
  expect(close).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})

it('bloqueia fechar/cancelar e reenvio enquanto a exclusão está em curso', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  const { rerender } = render(<DeleteWalletDialog wallet={wallet} onClose={close} />)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByRole('textbox'), 'Viagem')
  deletion.isPending = true
  rerender(<DeleteWalletDialog wallet={wallet} onClose={close} />)
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Excluindo…' })).toBeDisabled()
})
