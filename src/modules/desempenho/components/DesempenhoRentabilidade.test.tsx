import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesempenhoRentabilidade } from './DesempenhoRentabilidade'
import { usePerformance } from '../../performance/hooks/usePerformance'
import { usePositions } from '../../portfolio/hooks/usePositions'

vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: vi.fn(() => ({ data: [
  { ticker: 'AAA3', asset: { type: 'stock_br' } }, { ticker: 'FII11', asset: { type: 'fii' } },
] })) }))
vi.mock('../../performance/hooks/usePerformance', () => ({ usePerformance: vi.fn(() => ({
  portfolioSeries: { label: 'Carteira', color: 'blue', points: [] }, benchmarkSeries: [], summary: {}, assetRows: [], monthlyTableData: [], isLoading: false,
})) }))
vi.mock('../../performance/components/PerformanceLineChart', () => ({ default: () => <div>Gráfico</div> }))

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
