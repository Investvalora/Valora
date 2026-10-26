import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesempenhoRentabilidade } from './DesempenhoRentabilidade'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import type { PositionWithAsset } from '../../portfolio/types'

vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: vi.fn(() => ({ data: [
  { ticker: 'AAA3', asset: { type: 'stock_br' } }, { ticker: 'FII11', asset: { type: 'fii' } },
] })) }))
vi.mock('../../performance/hooks/usePerformance', () => ({ usePerformance: vi.fn(() => ({
  portfolioSeries: { label: 'Carteira', color: 'blue', points: [] }, benchmarkSeries: [], summary: {}, assetRows: [], monthlyTableData: [], isLoading: false,
})) }))
vi.mock('../../performance/components/PerformanceLineChart', () => ({ default: () => <div>Gráfico</div> }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: vi.fn(() => ({ data: [] })) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: vi.fn(() => ({ data: { rate: 5 } })) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usePositions).mockReturnValue({ data: [
    { ticker: 'AAA3', asset: { type: 'stock_br' } }, { ticker: 'FII11', asset: { type: 'fii' } },
  ] } as ReturnType<typeof usePositions>)
  vi.mocked(useLatestQuotes).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useLatestQuotes>)
  vi.mocked(useUSDRate).mockReturnValue({ data: { rate: 5 } } as ReturnType<typeof useUSDRate>)
  vi.mocked(usePerformance).mockReturnValue({ portfolioSeries: { label: 'Carteira', color: 'blue', points: [] }, benchmarkSeries: [], summary: {}, assetRows: [], monthlyTableData: [], isLoading: false } as unknown as ReturnType<typeof usePerformance>)
})

it('envia período, classe e carteira ao cálculo e mantém as outras classes disponíveis', async () => {
  const user = userEvent.setup()
  render(<DesempenhoRentabilidade />)
  expect(usePositions).toHaveBeenCalledWith('wallet')
  expect(usePerformance).toHaveBeenLastCalledWith('Tudo', 'wallet', undefined)
  await user.selectOptions(screen.getByLabelText('Tipo de ativo da rentabilidade'), 'FII')
  expect(usePerformance).toHaveBeenLastCalledWith('Tudo', 'wallet', 'fii')
  expect(screen.getByRole('option', { name: 'Ação' })).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Período da rentabilidade'), '1A')
  expect(usePerformance).toHaveBeenLastCalledWith('1A', 'wallet', 'fii')
  await user.selectOptions(screen.getByLabelText('Tipo de ativo da rentabilidade'), 'Todos os tipos')
  expect(usePerformance).toHaveBeenLastCalledWith('1A', 'wallet', undefined)
})

function withMarketValues() {
  vi.mocked(usePositions).mockReturnValue({ data: [
    { ticker: 'AAA3', quantity: 10, average_price: 8, asset: { currency: 'BRL', type: 'stock_br' } },
    { ticker: 'US', quantity: 2, average_price: 10, asset: { currency: 'USD', type: 'stock_us' } },
    { ticker: 'SEM', quantity: 1, average_price: 20, asset: { currency: 'BRL', type: 'stock_br' } },
  ] as PositionWithAsset[] } as ReturnType<typeof usePositions>)
  vi.mocked(useLatestQuotes).mockReturnValue({ data: [
    { ticker: 'AAA3', close: 12, date: '2026-10-23' }, { ticker: 'US', close: 15, date: '2026-10-23' },
  ] } as ReturnType<typeof useLatestQuotes>)
  vi.mocked(useUSDRate).mockReturnValue({ data: { rate: 5 } } as ReturnType<typeof useUSDRate>)
  vi.mocked(usePerformance).mockReturnValue({
    portfolioSeries: { label: 'Carteira', color: 'blue', points: [] }, benchmarkSeries: [], summary: {},
    assetRows: ['AAA3', 'US', 'SEM'].map((ticker) => ({ ticker, name: ticker, totalReturnPct: null, capitalGainPct: null, dividendsReceived: 0, dividendsPct: null })),
    monthlyTableData: [], isLoading: false,
  } as unknown as ReturnType<typeof usePerformance>)
}

it('exibe valor de mercado na coluna Valor atual, convertido para BRL, sem substituir cotação ausente pelo custo', () => {
  withMarketValues()
  render(<DesempenhoRentabilidade />)
  expect(within(screen.getByRole('row', { name: /AAA3/ })).getByText(/R\$\s*120,00/)).toBeInTheDocument()
  expect(within(screen.getByRole('row', { name: /US Stock US/ })).getByText(/R\$\s*150,00/)).toBeInTheDocument()
  expect(within(screen.getByRole('row', { name: /SEM/ })).getAllByRole('cell')[2]).toHaveTextContent('—')
})

it('sem câmbio mantém o valor brasileiro e deixa o valor em dólar indisponível', () => {
  withMarketValues()
  vi.mocked(useUSDRate).mockReturnValue({ data: undefined, isLoading: false } as ReturnType<typeof useUSDRate>)
  render(<DesempenhoRentabilidade />)
  expect(within(screen.getByRole('row', { name: /AAA3/ })).getAllByRole('cell')[2]).toHaveTextContent(/120,00/)
  expect(within(screen.getByRole('row', { name: /US Stock US/ })).getAllByRole('cell')[2]).toHaveTextContent('—')
})

it('não apresenta cotação antiga em cache como disponível após falha da consulta', () => {
  withMarketValues()
  vi.mocked(useLatestQuotes).mockReturnValue({ data: [{ ticker: 'AAA3', close: 12 }], isError: true } as ReturnType<typeof useLatestQuotes>)
  render(<DesempenhoRentabilidade />)
  expect(within(screen.getByRole('row', { name: /AAA3/ })).getAllByRole('cell')[2]).toHaveTextContent('—')
})
