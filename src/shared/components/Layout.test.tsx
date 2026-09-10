import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Layout } from './Layout'

const mocks = vi.hoisted(() => ({ count: 0 }))

vi.mock('../../modules/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'investidor@valora.test' }, logout: vi.fn() }),
}))

vi.mock('../../modules/alerts/hooks/useAlerts', () => ({
  useNewAlertsCount: () => ({ data: mocks.count }),
}))

describe('Layout', () => {
  beforeEach(() => {
    mocks.count = 0
  })

  it('exibe apenas a quantidade de alertas novos', () => {
    mocks.count = 2
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText('2 alertas novos')).toHaveTextContent('2')
  })
})