import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetActions } from './AssetActions'
import type { PositionRow } from '../../portfolio/types'

vi.mock('../../portfolio/components/AddTransactionModal', () => ({ AddTransactionModal: ({ ticker, assetType }: { ticker: string; assetType: string }) => <div data-testid="launch">{ticker}:{assetType}</div> }))
vi.mock('../../portfolio/components/TransactionListModal', () => ({ TransactionListModal: ({ ticker }: { ticker: string }) => <div data-testid="history">{ticker}</div> }))
afterEach(cleanup)

it.each(['stock_br', 'stock_us', 'fii', 'bdr', 'etf_br', 'etf_us', 'reit', 'crypto'])('oferece lançamento contextual para %s', (type) => {
  const row = { ticker: 'ATIVO', type, name: 'Meu ativo' } as PositionRow
  render(<MemoryRouter><AssetActions row={row} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Opções de ATIVO' }))
  expect(screen.getByRole('link', { name: 'Ver resumo do ativo' })).toHaveAttribute('href', '/ativo/ativo')
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar lançamento' }))
  expect(screen.getByTestId('launch')).toHaveTextContent(`ATIVO:${type}`)
})

it('consulta lançamentos somente do ativo escolhido', () => {
  render(<MemoryRouter><AssetActions row={{ ticker: 'MXRF11' } as PositionRow} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Opções de MXRF11' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ver lançamentos' }))
  expect(screen.getByTestId('history')).toHaveTextContent('MXRF11')
})
