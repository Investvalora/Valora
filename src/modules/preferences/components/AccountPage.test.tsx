import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../../auth/services/authService'
import { AccountPage } from './AccountPage'

const logout = vi.fn()
const user = {
  id: 'user-1',
  email: 'sessao@valora.test',
  created_at: '2025-01-15T12:00:00Z',
  last_sign_in_at: '2026-10-16T12:00:00Z',
  user_metadata: { full_name: 'Nome da sessão', phone: '11999990000' },
}

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user, logout }),
}))

vi.mock('../../auth/services/authService', () => ({
  authService: { getUserProfile: vi.fn() },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><AccountPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Perfil e conta', () => {
  beforeEach(() => {
    vi.mocked(authService.getUserProfile).mockReset()
    logout.mockReset()
  })

  it('mostra os dados do perfil cadastrado e o avatar com iniciais', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue({
      id: 'user-1',
      email: 'perfil@valora.test',
      full_name: 'Ana Carvalho',
      phone: '11988887777',
      created_at: '2025-01-15T12:00:00Z',
      updated_at: '2025-01-15T12:00:00Z',
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Ana Carvalho' })).toBeInTheDocument()
    expect(screen.getAllByText('perfil@valora.test')).toHaveLength(2)
    expect(screen.getByText('11988887777')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.queryByText('Último acesso')).not.toBeInTheDocument()
    expect(screen.queryByText('Conta criada em')).not.toBeInTheDocument()
    expect(screen.queryByText('Seu espaço')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Estado do menu'), { target: { value: 'compact' } })
    expect(localStorage.getItem('valora:sidebar:v1:user-1')).toBe('compact')
    fireEvent.change(screen.getByLabelText('Estado do menu'), { target: { value: 'expanded' } })
    expect(localStorage.getItem('valora:sidebar:v1:user-1')).toBe('expanded')
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveClass('text-rose-300')
  })

  it('usa os metadados da sessão quando o perfil não está disponível', async () => {
    vi.mocked(authService.getUserProfile).mockResolvedValue(null)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nome da sessão' })).toBeInTheDocument()
    expect(screen.getByText('11999990000')).toBeInTheDocument()
    expect(screen.getAllByText('sessao@valora.test')).toHaveLength(2)
  })
})
