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
  it('mantém a nav mobile acessível sem a barra desktop', () => {
    render(
      <MemoryRouter initialEntries={['/inicio']}>
        <Routes>
          <Route path="/" element={<AppShellNovo />}>
            <Route path="inicio" element={<h1>Início</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument()

    // A nav mobile contém o link /inicio — pode haver mais de um (sidebar desktop também tem)
    const inicioLinks = screen.getAllByRole('link', { name: 'Início' })
    const mobileNavLink = inicioLinks.find(
      (el) => el.closest('nav[aria-label="Navegação principal"]') !== null,
    )
    expect(mobileNavLink).toBeDefined()
    expect(mobileNavLink).toHaveAttribute('href', '/inicio')

    expect(screen.getByRole('banner')).toHaveClass('hidden', 'md:flex')
    expect(screen.getByRole('main')).toHaveClass('md:px-10')
  })
})
