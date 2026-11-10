import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../../auth/services/authService'
import { AccountPage } from './AccountPage'

const logout = vi.fn()
const push = vi.hoisted(() => ({
  enabled: false, busy: false, error: '', supported: true, configured: true, ready: true, toggle: vi.fn(),
}))
const user = {
  id: 'user-1',
  email: 'sessao@valora.test',
  user_metadata: { full_name: 'Nome da sessão', phone: '11999990000' },
}

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user, logout }),
}))

vi.mock('../../auth/services/authService', () => ({
  authService: { getUserProfile: vi.fn() },
}))
vi.mock('../../alerts/hooks/usePushNotifications', () => ({ usePushNotifications: () => push }))

function renderPage(path = '/conta') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/conta" element={<AccountPage />} />
          <Route path="/conta/:section" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Perfil e conta', () => {
  beforeEach(() => {
    vi.mocked(authService.getUserProfile).mockReset()
    logout.mockReset()
    push.enabled = false
    push.toggle.mockReset()
    vi.mocked(authService.getUserProfile).mockResolvedValue({
      id: 'user-1', email: 'perfil@valora.test', full_name: 'Ana Carvalho', phone: '11988887777',
    } as never)
  })

  it('mostra o perfil e abre cada seção sem sair da conta', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Ana Carvalho' })).toBeInTheDocument()
    const mobileIdentity = screen.getByRole('group', { name: 'Conta conectada' })
    expect(mobileIdentity).toHaveClass('md:hidden')
    expect(within(mobileIdentity).getByText('AC')).toBeInTheDocument()
    expect(within(mobileIdentity).getByText('Ana Carvalho')).toBeInTheDocument()
    expect(within(mobileIdentity).getByText('sessao@valora.test')).toBeInTheDocument()
    expect(within(mobileIdentity).getByText('11988887777')).toBeInTheDocument()
    expect(screen.getByText('Desativadas neste dispositivo')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gerenciar preferências e notificações' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sua conta, do seu jeito')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Meus dados/ })).toHaveAttribute('href', '/conta/dados')
    fireEvent.click(screen.getByRole('link', { name: /Meus dados/ }))
    expect(document.querySelector('.account-section-panel')).toHaveAttribute('data-direction', 'down')
    expect(screen.getByRole('link', { name: 'Voltar para perfil e conta' })).toHaveAttribute('href', '/conta')
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Carvalho')
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('11988887777')
    fireEvent.click(screen.getByRole('link', { name: /Alterar meu email/ }))
    expect(screen.getByText('sessao@valora.test', { selector: 'p.font-medium' })).toBeInTheDocument()
    expect(screen.getByLabelText('Novo email')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Alterar minha senha/ }))
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Opções da conta' })).getByRole('link', { name: /Preferências e notificações/ }))
    expect(document.querySelector('.account-section-panel')).toHaveAttribute('data-direction', 'down')
    fireEvent.change(screen.getByLabelText('Estado do menu'), { target: { value: 'compact' } })
    expect(localStorage.getItem('valora:sidebar:v1:user-1')).toBe('compact')
    fireEvent.click(screen.getByRole('button', { name: 'Ativar notificações' }))
    expect(push.toggle).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('link', { name: /Meus dados/ }))
    expect(document.querySelector('.account-section-panel')).toHaveAttribute('data-direction', 'up')
    fireEvent.click(screen.getByRole('link', { name: 'Voltar para perfil e conta' }))
    expect(document.querySelector('.account-menu')).toHaveAttribute('data-returning', 'true')
    expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toBeEnabled()
  })

  it('usa os metadados da sessão quando o perfil não está disponível', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue(null)
    renderPage('/conta/dados')
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Nome da sessão')
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('11999990000')
  })

  it('permite desativar as notificações já ativadas neste dispositivo', async () => {
    push.enabled = true
    renderPage('/conta/preferencias')
    expect(screen.getByRole('status')).toHaveTextContent('Ativadas neste dispositivo')
    const button = screen.getByRole('button', { name: 'Desativar notificações' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(push.toggle).toHaveBeenCalledOnce()
  })

  it('respeita o telefone removido no perfil sem recuperar um número antigo da sessão', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue({ id: 'user-1', email: 'sessao@valora.test', full_name: 'Ana Carvalho', phone: null } as never)
    renderPage('/conta/dados')
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Carvalho'))
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('')
  })
})
