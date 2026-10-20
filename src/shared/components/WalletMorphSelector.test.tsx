import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
    expect(screen.getByRole('button', { name: 'Selecionar carteira Reserva' })).toHaveStyle({ transform: 'translateY(0px)' })
    expect(screen.getByRole('group', { name: 'Carteiras disponíveis' })).not.toHaveClass('wallet-selector-fade')
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

  it('mostra o estado vazio sem ações de criação no seletor', () => {
    wallets = []
    selectedWallet = null
    render(<WalletMorphSelector />)

    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma carteira')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('abre a gestão quando só existe a carteira atual', () => {
    wallets = [primary]
    render(
      <MemoryRouter initialEntries={['/inicio']}>
        <Routes>
          <Route path="/inicio" element={<WalletMorphSelector />} />
          <Route path="/carteiras" element={<h1>Carteiras</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Carteira atual: Principal/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar carteiras' }))

    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
  })

  it('move nomes longos também ao receber foco', () => {
    selectedWallet = { ...primary, name: 'Carteira de investimentos de longo prazo' }
    wallets = [selectedWallet, reserve]
    render(<WalletMorphSelector />)

    const current = screen.getByRole('button', { name: /Carteira atual: Carteira de investimentos/ })
    expect([...current.querySelectorAll('span')].some((span) => span.className.includes('group-focus:-translate-x-[35%]'))).toBe(true)

    fireEvent.click(current)
    expect(screen.queryByRole('button', { name: 'Nova carteira' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gerenciar carteiras' })).toBeNull()
  })

  it('desdobra as pills de dentro da atual e mostra três carteiras antes da rolagem', () => {
    wallets = [primary, ...Array.from({ length: 10 }, (_, index) => ({
      ...reserve,
      id: `wallet-${index + 1}`,
      name: `Carteira ${index + 1}`,
    }))]
    render(<WalletMorphSelector />)

    const current = screen.getByRole('button', { name: /Carteira atual: Principal/ })
    const hiddenList = document.getElementById('wallet-selector-panel')!
    expect(hiddenList).toHaveStyle({ height: '0px' })
    fireEvent.click(current)
    const list = screen.getByRole('group', { name: 'Carteiras disponíveis' })
    expect(list).toHaveClass('wallet-selector-scroll', 'overflow-y-auto')
    expect(list).toHaveClass('wallet-selector-fade')
    expect(list).toHaveStyle({ height: '90px' })
    expect(list.querySelectorAll('button')).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Selecionar carteira Carteira 1' })).toHaveStyle({ transform: 'translateY(0px)' })
    expect(screen.getByRole('button', { name: 'Selecionar carteira Carteira 3' })).toHaveStyle({ transform: 'translateY(90px)' })
    expect(screen.queryByRole('button', { name: 'Nova carteira' })).toBeNull()

    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 90 },
      scrollHeight: { configurable: true, value: 450 },
      scrollTop: { configurable: true, writable: true, value: 360 },
    })
    fireEvent.scroll(list)
    expect(list).not.toHaveClass('wallet-selector-fade')

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar carteira Carteira 10' }))
    expect(selectWallet).toHaveBeenCalledWith('wallet-10')
    expect(list).toHaveStyle({ height: '0px' })
  })
})
