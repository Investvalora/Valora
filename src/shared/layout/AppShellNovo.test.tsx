import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShellNovo } from './AppShellNovo'
const monitor = vi.hoisted(() => ({ isError: false, isFetching: false, refetch: vi.fn() }))
const quickModal = vi.hoisted(() => ({ render: vi.fn() }))
vi.mock('../../modules/alerts/hooks/usePriceTargetMonitor', () => ({ usePriceTargetMonitor: () => monitor }))

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
  QuickTransactionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    quickModal.render()
    return isOpen ? <div role="dialog" aria-label="Lançamento de teste"><button onClick={onClose}>Cancelar teste</button></div> : null
  },
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
    expect(document.querySelector('.mobile-navigation')?.parentElement).toBe(document.body)

    expect(screen.getByRole('banner')).toHaveClass('hidden', 'md:flex')
    expect(screen.getByRole('main')).toHaveClass('md:px-10')
  })
})

it('abre o lançamento sob demanda e permite fechar e reabrir sem trocar a página', async () => {
  quickModal.render.mockClear()
  render(<MemoryRouter><AppShellNovo /></MemoryRouter>)
  expect(quickModal.render).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /^Lançamento$/ }))
  expect(await screen.findByRole('dialog', { name: 'Lançamento de teste' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar teste' }))
  expect(screen.queryByRole('dialog', { name: 'Lançamento de teste' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^Novo lançamento$/ }))
  expect(await screen.findByRole('dialog', { name: 'Lançamento de teste' })).toBeInTheDocument()
})

it('mostra falha do monitor e permite tentar novamente sem bloquear a pagina', () => {
  monitor.isError = true
  const { rerender } = render(<MemoryRouter><AppShellNovo /></MemoryRouter>)
  expect(screen.getByRole('status', { name: 'Verificação de alertas' })).toHaveTextContent('Seus alertas existentes foram mantidos.')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(monitor.refetch).toHaveBeenCalledOnce()
  monitor.isError = false
  rerender(<MemoryRouter><AppShellNovo /></MemoryRouter>)
  expect(screen.queryByRole('status', { name: 'Verificação de alertas' })).not.toBeInTheDocument()
})
