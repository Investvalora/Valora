import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WealthEvolution } from './WealthEvolution'
import { TopBar } from '../../../shared/components/TopBar'
import { useChartPeriod, chartDateRange } from '../../../shared/stores/useChartPeriod'
import { useDashboard } from '../../dashboard/hooks/useDashboard'

vi.mock('../../dashboard/hooks/useDashboard', () => ({ useDashboard: vi.fn(() => ({ monthlySeries: [], isLoading: false, isError: false })) }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'w1' } }) }))
vi.mock('../../../shared/components/WalletMorphSelector', () => ({ WalletMorphSelector: () => null }))

beforeEach(() => { useChartPeriod.setState({ period: '1A', from: '2026-09-01', to: '2026-09-30' }); vi.clearAllMocks() })

it('filtra período no gráfico sem duplicar no topo, aplica tipo e valida intervalo personalizado', () => {
  render(<MemoryRouter><TopBar /><WealthEvolution /></MemoryRouter>)
  expect(screen.getAllByLabelText('Período da evolução do patrimônio')).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Período da evolução do patrimônio'), { target: { value: '2A' } })
  expect(screen.queryByLabelText('Período do gráfico')).not.toBeInTheDocument()
  expect(useDashboard).toHaveBeenLastCalledWith('w1', expect.objectContaining(chartDateRange('2A', '', '')))
  fireEvent.change(screen.getByLabelText('Tipo de ativo do gráfico'), { target: { value: 'fii' } })
  expect(useDashboard).toHaveBeenLastCalledWith('w1', expect.objectContaining({ type: 'fii' }))
  fireEvent.change(screen.getByLabelText('Período da evolução do patrimônio'), { target: { value: 'custom' } })
  expect(screen.getByLabelText('Período da evolução do patrimônio')).toHaveValue('custom')
  expect(useDashboard).toHaveBeenLastCalledWith('w1', { from: '2026-09-01', to: '2026-09-30', type: 'fii' })
  fireEvent.input(screen.getByLabelText('Data inicial do gráfico'), { target: { value: '2026-10-01' } })
  expect(screen.getByRole('alert')).toHaveTextContent('data inicial anterior ou igual à final')
})

it('calcula períodos atravessando o ano, sem limitar Tudo a 365 dias', () => {
  const now = new Date('2026-02-15T12:00:00Z')
  expect(chartDateRange('1A', '', '', now)).toEqual({ from: '2025-03-01', to: '2026-02-15' })
  expect(chartDateRange('2A', '', '', now).from).toBe('2024-03-01')
  expect(chartDateRange('Tudo', '', '', now).from).toBe('1900-01-01')
})
