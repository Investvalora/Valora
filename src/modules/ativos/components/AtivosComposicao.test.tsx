import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AtivosComposicao } from './AtivosComposicao'

vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [
  { id: 'a', ticker: 'AAA3', quantity: 10, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'stock_br', name: 'Empresa A' } },
  { id: 'b', ticker: 'BBB3', quantity: 5, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'stock_br', name: 'Empresa B' } },
] }) }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [
  { ticker: 'AAA3', close: 10, date: '2026-10-23' },
  { ticker: 'BBB3', close: 20, date: '2026-10-23' },
] }) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: { rate: 5 } }) }))
vi.mock('../../portfolio/hooks/useDividendTotals', () => ({ useDividendTotals: () => new Map() }))

it('alterna gráfico e lista entre classe e tickers, inclusive pelo seletor mobile', async () => {
  const user = userEvent.setup()
  render(<AtivosComposicao />)
  expect(screen.getByRole('heading', { name: 'Composição por classe' })).toBeInTheDocument()
  const chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(chart.querySelectorAll('path')).toHaveLength(1)

  await user.click(screen.getByRole('button', { name: 'Ativos' }))
  expect(screen.getByRole('heading', { name: 'Composição por ativo' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ativos' })).toHaveAttribute('aria-pressed', 'true')
  expect(chart.querySelectorAll('path')).toHaveLength(2)
  expect(within(chart).getByLabelText(/AAA3:/)).toBeInTheDocument()
  expect(within(chart).getByLabelText(/BBB3:/)).toBeInTheDocument()
  expect(within(chart).getAllByText(/R\$\s*100,00/)).toHaveLength(2)

  await user.selectOptions(screen.getByLabelText('Visualizar por'), 'Tipo de ativos')
  expect(screen.getByRole('heading', { name: 'Composição por classe' })).toBeInTheDocument()
  expect(chart.querySelectorAll('path')).toHaveLength(1)
})
