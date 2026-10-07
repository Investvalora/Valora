import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Wallet } from '../../modules/portfolio/services/walletService'
import { WalletMorphSelector } from './WalletMorphSelector'

const selectWallet = vi.fn()
const primary: Wallet = {
  id: 'primary',
  user_id: 'user-1',
  name: 'Principal',
  color: 'gold',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}
const reserve: Wallet = {
  ...primary,
  id: 'reserve',
  name: 'Reserva',
  color: 'green',
  is_default: false,
}

let wallets: Wallet[] = [primary, reserve]
let selectedWallet: Wallet | null = primary
let isLoading = false

vi.mock('../../modules/portfolio/hooks/useWallets', () => ({
  useWallets: () => ({ wallets, selectedWallet, selectWallet, isLoading, isError: false }),
}))

describe('Seletor de carteira do topo', () => {
  beforeEach(() => {
    wallets = [primary, reserve]
    selectedWallet = primary
    isLoading = false
    selectWallet.mockReset()
  })

  it('abre a pilha com carteiras reais e seleciona a carteira compartilhada', () => {
    const { rerender } = render(<WalletMorphSelector />)
    const current = screen.getByRole('button', { name: /Carteira atual: Principal/ })
    expect(current).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Selecionar carteira Reserva' })).toBeNull()

    fireEvent.click(current)
    expect(current).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar carteira Reserva' }))
    expect(selectWallet).toHaveBeenCalledTimes(1)
    expect(selectWallet).toHaveBeenCalledWith('reserve')

    selectedWallet = reserve
    rerender(<WalletMorphSelector />)
    expect(screen.getByRole('button', { name: /Carteira atual: Reserva/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('fecha com Escape sem alterar a carteira', () => {
    render(<WalletMorphSelector />)
    fireEvent.click(screen.getByRole('button', { name: /Carteira atual: Principal/ }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByRole('button', { name: /Carteira atual: Principal/ })).toHaveAttribute('aria-expanded', 'false')
    expect(selectWallet).not.toHaveBeenCalled()
  })

  it('mostra o carregamento sem inventar uma carteira', () => {
    wallets = []
    selectedWallet = null
    isLoading = true
    render(<WalletMorphSelector />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando carteiras…')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
