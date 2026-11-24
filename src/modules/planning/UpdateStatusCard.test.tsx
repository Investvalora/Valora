import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { UpdateStatusCard } from './UpdateStatusCard'
vi.mock('../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [{ ticker: 'AAPL', asset: { type: 'stock_us' } }] }) }))
vi.mock('../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [{ ticker: 'AAPL', updated_at: '2026-11-24T18:00:00Z', date: '2026-11-24' }], refetch: vi.fn() }) }))
it('abre por hover, teclado e toque e distingue próxima consulta de coleta', () => {
  render(<MemoryRouter><UpdateStatusCard /></MemoryRouter>)
  const button = screen.getByRole('button', { name: 'Dados disponíveis' })
  fireEvent.mouseEnter(button)
  expect(screen.getByRole('region', { name: 'Status das atualizações' })).toHaveTextContent('24/11/2026, 15:00')
  expect(screen.getByText(/Próxima coleta do fornecedor/)).toHaveTextContent('horário não disponibilizado')
  fireEvent.keyDown(button, { key: 'Escape' })
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  fireEvent.focus(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(button, { key: 'Escape' })
  fireEvent.click(button)
  expect(screen.getByRole('link', { name: 'Ver saúde dos dados' })).toHaveAttribute('href', '/analise/ferramentas?tab=health')
})
