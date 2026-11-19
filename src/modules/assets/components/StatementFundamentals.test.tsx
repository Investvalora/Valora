import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { StatementFundamentals } from './StatementFundamentals'
import { latestStatement, type StatementSnapshot } from '../services/statementCatalogService'
vi.mock('../services/statementCatalogService', () => ({ latestStatement: vi.fn() }))
const row: StatementSnapshot = { ticker: 'AAPL', accession: '0000320193-26-000001', cik: '0000320193', period_end: '2025-12-31', filing_date: '2026-02-01', collected_at: '',
  operating_margin: 0, free_cash_flow: -10, net_debt_ebitda: null, roic: null, revenue_cagr: 10, earnings_cagr: null }
it('keeps zero, negative cash flow, unavailable values and document identity distinct', async () => {
  vi.mocked(latestStatement).mockResolvedValue(row)
  render(<StatementFundamentals ticker="AAPL" />)
  expect(await screen.findByText('0%')).toBeInTheDocument()
  expect(screen.getByText(/-US\$\s*10,00/)).toBeInTheDocument()
  expect(screen.getAllByText('Indisponível')).toHaveLength(3)
  expect(screen.getByRole('link', { name: 'Consultar fonte SEC' })).toHaveAttribute('href', expect.stringContaining('/320193/000032019326000001/'))
})
it('distinguishes missing coverage from a failed request', async () => {
  vi.mocked(latestStatement).mockResolvedValue(null)
  const view = render(<StatementFundamentals ticker="AAPL" />)
  expect(await screen.findByText(/Sem demonstrativo validado/)).toBeInTheDocument()
  vi.mocked(latestStatement).mockRejectedValue(new Error('offline'))
  view.rerender(<StatementFundamentals ticker="MSFT" />)
  expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível consultar/)
  expect(screen.queryByText(/Sem demonstrativo validado/)).not.toBeInTheDocument()
})
