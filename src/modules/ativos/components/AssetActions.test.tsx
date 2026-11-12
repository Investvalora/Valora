import { cleanup, fireEvent, render as renderUI, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetActions } from './AssetActions'
import type { PositionRow } from '../../portfolio/types'
import type { Transaction } from '../../portfolio/services/transactionsService'

const history = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/components/DeferredQuickTransactionModal', () => ({
  DeferredQuickTransactionModal: ({ initialAsset }: { initialAsset: { ticker: string; type: string; currency: string } }) => (
    <div data-testid="launch">{initialAsset.ticker}:{initialAsset.type}:{initialAsset.currency}</div>
  ),
}))
vi.mock('../../portfolio/hooks/useTransactions', () => ({
  useTransactionsByTicker: history,
  useDeleteTransaction: () => ({ isPending: false }),
}))
vi.mock('../../portfolio/components/EditTransactionButton', () => ({ EditTransactionButton: () => <button type="button">Editar</button> }))
afterEach(cleanup)
const render = (node: ReactNode) => renderUI(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>)

it.each(['stock_br', 'stock_us', 'fii', 'bdr', 'etf_br', 'etf_us', 'reit', 'crypto'])('oferece lançamento contextual para %s', (type) => {
  const row = { ticker: 'ATIVO', type, name: 'Meu ativo', currency: 'USD' } as PositionRow
  render(<MemoryRouter><AssetActions row={row} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Opções de ATIVO' }))
  expect(screen.getByRole('link', { name: 'Ver resumo do ativo' })).toHaveAttribute('href', '/ativo/ativo')
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar lançamento' }))
  expect(screen.getByTestId('launch')).toHaveTextContent(`ATIVO:${type}:USD`)
})

it('expande o mesmo painel e mostra os lançamentos do ativo em cartões', () => {
  const transaction: Transaction = {
    id: 't1', seq: 1, user_id: 'u1', wallet_id: 'w1', ticker: 'AAPL', type: 'buy',
    quantity: 2, price: 10, brokerage_fee: 1, tax: 0,
    transaction_date: '2026-09-20', created_at: '2026-09-20T13:00:00Z',
  }
  history.mockReturnValue({ data: [transaction], isLoading: false, isError: false })
  render(<MemoryRouter><AssetActions row={{ ticker: 'AAPL', currency: 'USD' } as PositionRow} /></MemoryRouter>)
  const trigger = screen.getByRole('button', { name: 'Opções de AAPL' })
  fireEvent.click(trigger)
  const panel = screen.getByRole('dialog', { name: 'Opções · AAPL' })
  expect(panel).toHaveClass('floating-sheet-panel')
  expect(panel.parentElement).toHaveClass('floating-sheet-overlay')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(panel, { key: 'Escape' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  const reopenedPanel = screen.getByRole('dialog', { name: 'Opções · AAPL' })
  fireEvent.click(screen.getByRole('button', { name: 'Ver lançamentos' }))
  expect(screen.getByRole('dialog', { name: 'Lançamentos · AAPL' })).toBe(reopenedPanel)
  expect(reopenedPanel.querySelector('[data-sheet-expanded]')).toHaveAttribute('data-sheet-expanded', 'true')
  expect(history).toHaveBeenCalledWith('AAPL')
  const card = within(screen.getByRole('listitem'))
  expect(card.getByText('20/09/2026')).toBeInTheDocument()
  expect(card.getByText(/US\$\s*21,00/)).toBeInTheDocument()
  expect(card.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar às opções' }))
  expect(screen.getByRole('dialog', { name: 'Opções · AAPL' })).toBe(reopenedPanel)
})
