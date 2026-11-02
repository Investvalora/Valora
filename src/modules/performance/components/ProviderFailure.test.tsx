import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { RentabilidadePage } from './RentabilidadePage'
import { ProventosPage } from '../../dividends/components/ProventosPage'

const state = vi.hoisted(() => ({
  isError: true,
  isLoading: false,
  refetch: vi.fn(),
}))
vi.mock('../hooks/usePerformance', () => ({ usePerformance: () => ({
  ...state, error: new Error('Edge Function returned a non-2xx status code'),
}) }))
vi.mock('../../dividends/hooks/useDividends', () => ({
  useDividends: () => ({ ...state, rows: [], availableTypes: [], error: new Error('detalhe interno do provedor') }),
  useHasPositions: () => ({ hasPositions: true, isLoading: false }),
  useSyncDividends: () => ({ isPending: false, isError: false }),
}))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../../shared/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

beforeEach(() => {
  state.isError = true
  state.isLoading = false
  state.refetch.mockReset()
})

it.each([
  ['rentabilidade', RentabilidadePage],
  ['proventos', ProventosPage],
] as const)('mostra erro seguro de %s e permite retomar o carregamento', async (name, Page) => {
  const user = userEvent.setup()
  const { rerender } = render(<Page />)
  expect(screen.getByRole('alert')).toHaveTextContent(`Erro ao carregar ${name}`)
  expect(screen.getByRole('alert')).toHaveTextContent('Tente novamente em instantes')
  expect(screen.queryByText(/non-2xx|detalhe interno/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(state.refetch).toHaveBeenCalledOnce()
  state.isError = false
  state.isLoading = true
  rerender(<Page />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByText(new RegExp(`Carregando ${name}`))).toBeInTheDocument()
})
