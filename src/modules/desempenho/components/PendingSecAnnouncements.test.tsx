import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PendingSecAnnouncements } from './PendingSecAnnouncements'
const state = vi.hoisted(() => ({ error: false, loading: false }))
vi.mock('../../dividends/hooks/usePendingSecAnnouncements', () => ({ usePendingSecAnnouncements: () => ({
  data: [{ ticker: 'COST', accession: '0000909832-26-000134', declaration_date: '2026-11-10', record_date: '2026-11-24', payment_date: '2026-12-04', value_per_share: 30, distribution: 'special', source_url: 'https://www.sec.gov/Archives/edgar/data/909832/000090983226000134/cost-20261107.htm' }],
  isError: state.error, isLoading: state.loading, refetch: vi.fn(),
}) }))
afterEach(() => { cleanup(); state.error = false; state.loading = false })
it('mostra especial em USD sem converter corte em ex nem prometer crédito pessoal', () => {
  render(<PendingSecAnnouncements period="1A" search="cost" />)
  expect(screen.getByText('COST · Dividendo especial')).toBeInTheDocument()
  expect(screen.getByText('US$ 30,00')).toBeInTheDocument()
  expect(screen.getByText(/não calculamos quantidade elegível/)).toBeInTheDocument()
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.queryByText(/Total estimado:/)).not.toBeInTheDocument()
})
it('respeita filtro sem afirmar cobertura completa', () => {
  render(<PendingSecAnnouncements period="6M" search="MA" />)
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(screen.getByText(/Isso não comprova ausência/)).toBeInTheDocument()
})
it('distingue falha de ausência de anúncios', () => {
  state.error = true
  render(<PendingSecAnnouncements period="Tudo" search="" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível')
  expect(screen.queryByText(/Nenhuma declaração pendente/)).not.toBeInTheDocument()
})
