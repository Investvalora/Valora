import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShellNovo } from './AppShellNovo'

vi.mock('../../modules/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'teste@valora.local', user_metadata: {} } }),
}))
vi.mock('../../modules/alerts/hooks/useAlerts', () => ({
  useNewAlertsCount: () => ({ data: 0 }),
}))
vi.mock('../../modules/portfolio/hooks/useWallets', () => ({
  useWallets: () => ({ wallets: [], selectedWallet: null, isLoading: false, isError: false }),
}))
vi.mock('../../modules/portfolio/components/QuickTransactionModal', () => ({
  QuickTransactionModal: () => null,
}))

describe('Shell do fluxo atual', () => {
  it('mantém a carteira mobile acessível sem a barra desktop', () => {
    render(
      <MemoryRouter initialEntries={['/carteira']}>
        <Routes>
          <Route path="/" element={<AppShellNovo />}>
            <Route path="carteira" element={<h1>Carteira mobile</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Carteira mobile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Carteira' })).toHaveAttribute('href', '/carteira')
    expect(screen.getByRole('link', { name: 'Carteira' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('banner')).toHaveClass('hidden', 'md:flex')
    expect(screen.getByRole('main')).toHaveClass('md:px-10')
  })
})
