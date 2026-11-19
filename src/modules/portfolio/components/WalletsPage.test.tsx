import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletsPage } from './WalletsPage'
import type { Wallet } from '../services/walletService'

const selectWallet = vi.fn()
const createWallet = vi.fn()
const updateWallet = vi.fn()
const deleteWallet = vi.fn()
const wallet = {
  id: 'wallet-1',
  user_id: 'user-1',
  name: 'Principal',
  color: 'gold' as const,
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}
const secondary = { ...wallet, id: 'wallet-2', name: 'Reserva', color: 'green' as const, is_default: false }
let currentWallets: Wallet[] = [wallet]
let totals = new Map<string, number | null>()
vi.mock('../hooks/useWalletTotals', () => ({ useWalletTotals: () => ({ totals, isLoading: false, isError: false }) }))

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: currentWallets,
    selectedWallet: wallet,
    selectWallet,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateWallet: () => ({ mutateAsync: createWallet, isPending: false }),
  useUpdateWallet: () => ({ mutateAsync: updateWallet, isPending: false }),
  useDeleteWallet: () => ({ mutateAsync: deleteWallet, isPending: false }),
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
    currentWallets = [wallet]
    totals = new Map([['wallet-1', 5000]])
    deleteWallet.mockReset().mockResolvedValue(undefined)
    createWallet.mockReset().mockResolvedValue(undefined)
    updateWallet.mockReset().mockResolvedValue(undefined)
  })

  it('totaliza todas as carteiras no desktop e mantém seleção, edição e exclusão independentes', () => {
    currentWallets = [wallet, secondary]
    totals.set('wallet-2', 1500)
    renderPage()
    expect(within(screen.getByRole('region', { name: 'Total de todas as carteiras' })).getByText(/R\$\s*6.500,00/)).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Principal' }).closest('article')!
    expect(card).toHaveStyle({ backgroundColor: '#d8b632' })
    expect(within(card).getByText('Selecionada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir Principal' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Reserva' }))
    expect(selectWallet).not.toHaveBeenCalled()
    expect(deleteWallet).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog', { name: 'Excluir carteira' })).getByText('Reserva')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(deleteWallet).not.toHaveBeenCalled()
  })

  it('não apresenta uma soma parcial quando uma carteira está sem avaliação', () => {
    currentWallets = [wallet, secondary]
    totals.set('wallet-2', null)
    renderPage()
    const total = screen.getByRole('region', { name: 'Total de todas as carteiras' })
    expect(within(total).getByText('—')).toBeInTheDocument()
    expect(within(total).queryByText(/5.000,00/)).not.toBeInTheDocument()
  })

  it('abre a lista sem editor ao entrar por Gerenciar e edita no painel lateral', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Principal selecionada' })).toHaveStyle({ boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.24)' })

    fireEvent.click(screen.getByRole('button', { name: 'Editar Principal' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar carteira' })
    expect(dialog).toHaveClass('wallet-modal-panel')
    expect(within(dialog).getByRole('heading', { name: 'Editar carteira' })).toHaveClass('text-base', 'font-medium')
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
