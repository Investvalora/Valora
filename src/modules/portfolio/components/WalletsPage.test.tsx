import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletsPage } from './WalletsPage'

const selectWallet = vi.fn()
const createWallet = vi.fn()
const updateWallet = vi.fn()
const wallet = {
  id: 'wallet-1',
  user_id: 'user-1',
  name: 'Principal',
  color: 'gold' as const,
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [wallet],
    selectedWallet: wallet,
    selectWallet,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateWallet: () => ({ mutateAsync: createWallet, isPending: false }),
  useUpdateWallet: () => ({ mutateAsync: updateWallet, isPending: false }),
}))

function renderPage(path = '/carteiras') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/carteiras" element={<WalletsPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('Gerenciamento de carteiras', () => {
  beforeEach(() => {
    selectWallet.mockClear()
    createWallet.mockReset().mockResolvedValue(undefined)
    updateWallet.mockReset().mockResolvedValue(undefined)
  })

  it('abre a lista sem editor ao entrar por Gerenciar e edita no painel lateral', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Principal selecionada' }).style.boxShadow).toContain('#d8b632')

    fireEvent.click(screen.getByRole('button', { name: 'Editar Principal' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar carteira' })
    expect(dialog).toHaveClass('wallet-modal-panel')
    expect(screen.getByLabelText('Nome da carteira')).toHaveValue('Principal')

    fireEvent.change(screen.getByLabelText('Nome da carteira'), { target: { value: 'Reforma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(updateWallet).toHaveBeenCalledWith({ walletId: 'wallet-1', name: 'Reforma', color: 'gold' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('abre Nova carteira ao chegar pelo seletor e mantém o modal durante a animação de saída', async () => {
    renderPage('/carteiras?nova=1')
    const dialog = screen.getByRole('dialog', { name: 'Nova carteira' })
    expect(dialog).toHaveClass('wallet-modal-panel')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(dialog.closest('[data-closing]')).toHaveAttribute('data-closing', 'true')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
