import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PortfolioScore } from './PortfolioScore'
import type { ScoreRule } from '../types'
const mocks = vi.hoisted(() => ({ valuation: vi.fn(), fundamentals: vi.fn() }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet', name: 'Teste' } }) }))
vi.mock('../../ativos/hooks/useAtivosValuation', () => ({ useAtivosValuation: (...args: unknown[]) => mocks.valuation(...args) }))
vi.mock('../hooks/useFundamentals', () => ({ useFundamentals: (...args: unknown[]) => mocks.fundamentals(...args) }))
const rules: ScoreRule[] = [{ id: 'r', user_id: 'u', name: 'S', metric: 'dy', operator: 'gte', threshold_min: 6, threshold_max: null, points: 80, created_at: '' }]
beforeEach(() => {
  const rows = [{ ticker: 'A', type: 'stock_br', marketValueBRL: 100 }, { ticker: 'B', type: 'stock_us', marketValueBRL: 300 }, { ticker: 'FII', type: 'fii', marketValueBRL: 400 }]
  mocks.valuation.mockReturnValue({ rows, compositionRows: rows, tickers: ['A','B','FII'] })
  mocks.fundamentals.mockReturnValue({ data: [{ ticker: 'A', dy: 0, source: 'yahoo' }, { ticker: 'B', dy: 8, source: 'yahoo' }, { ticker: 'FII', dy: 20, source: 'yahoo' }] })
})
it('usa a carteira inteira e inclui fundos apenas no denominador da cobertura', () => {
  render(<PortfolioScore rules={rules} />)
  expect(screen.getByText('60 / 100')).toBeInTheDocument()
  expect(screen.getByText(/Cobertura do patrimônio: 50%/)).toBeInTheDocument()
  expect(mocks.valuation).toHaveBeenCalledWith('wallet', true)
})
it('exclui dados demonstrativos e critérios incompletos da média', () => {
  mocks.fundamentals.mockReturnValue({ data: [{ ticker: 'A', dy: 9, source: 'seed' }, { ticker: 'B', dy: null, source: 'yahoo' }] })
  render(<PortfolioScore rules={rules} />)
  expect(screen.getByText('Indisponível')).toBeInTheDocument()
  expect(screen.getByText(/Cobertura do patrimônio: 0%/)).toBeInTheDocument()
})
it('não publica número ou cobertura quando a consulta falha', () => {
  mocks.fundamentals.mockReturnValue({ isError: true, data: [] })
  render(<PortfolioScore rules={rules} />)
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText(/Cobertura do patrimônio: indisponível/)).toBeInTheDocument()
})
