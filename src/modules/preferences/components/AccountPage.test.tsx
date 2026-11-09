import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../../auth/services/authService'
import { AccountPage } from './AccountPage'

const logout = vi.fn()
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
    vi.mocked(authService.getUserProfile).mockResolvedValue({
      id: 'user-1', email: 'perfil@valora.test', full_name: 'Ana Carvalho', phone: '11988887777',
    } as never)
  })

  it('mostra o perfil e abre cada seção sem sair da conta', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Ana Carvalho' })).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('sessao@valora.test')).toBeInTheDocument()
    expect(screen.getByText('Escolha uma opção ao lado.')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('link', { name: /Preferências/ }))
    expect(document.querySelector('.account-section-panel')).toHaveAttribute('data-direction', 'down')
    fireEvent.change(screen.getByLabelText('Estado do menu'), { target: { value: 'compact' } })
    expect(localStorage.getItem('valora:sidebar:v1:user-1')).toBe('compact')
    fireEvent.click(screen.getByRole('link', { name: /Meus dados/ }))
    expect(document.querySelector('.account-section-panel')).toHaveAttribute('data-direction', 'up')
    fireEvent.click(screen.getByRole('link', { name: 'Voltar para perfil e conta' }))
    expect(document.querySelector('.account-menu')).toHaveAttribute('data-returning', 'true')
    expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toBeEnabled()
  })

  it('usa os metadados da sessão quando o perfil não está disponível', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue(null)
    renderPage('/conta/dados')
    expect(await screen.findByRole('heading', { name: 'Nome da sessão' })).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('11999990000')
  })

  it('respeita o telefone removido no perfil sem recuperar um número antigo da sessão', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue({ id: 'user-1', email: 'sessao@valora.test', full_name: 'Ana Carvalho', phone: null } as never)
    renderPage('/conta/dados')
    expect(await screen.findByRole('heading', { name: 'Ana Carvalho' })).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('')
  })
})
