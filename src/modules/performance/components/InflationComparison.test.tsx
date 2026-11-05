import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InflationComparison } from './InflationComparison'
import { benchmarkService } from '../services/benchmarkService'

vi.mock('../services/benchmarkService', () => ({ benchmarkService: { listMonthlyInflation: vi.fn() } }))
vi.mock('../../../shared/utils/isoDate', () => ({ toIsoDate: () => '2026-04-15' }))
vi.mock('./PerformanceLineChart', () => ({ default: ({ series }: { series: { label: string }[] }) => <div>{series.map(s => s.label).join(' e ')}</div> }))
beforeEach(() => vi.clearAllMocks())

function show() {
  render(<QueryClientProvider client={new QueryClient()}><InflationComparison portfolio={{
    label: 'Carteira', color: 'blue', points: [{ date: '2026-01-31', normalized: 100 }, { date: '2026-02-28', normalized: 105 }],
  }} /></QueryClientProvider>)
}

it('mostra o benchmark mensal sem substituir os índices do gráfico existente', async () => {
  vi.mocked(benchmarkService.listMonthlyInflation).mockResolvedValue([{ date: '2026-02-01', value: 1 }])
  show()
  expect(await screen.findByText('Carteira e IPCA')).toBeInTheDocument()
  expect(screen.getByRole('heading')).toHaveTextContent('meses completos publicados')
})

it('não transforma ausência de IPCA em inflação zero', async () => {
  vi.mocked(benchmarkService.listMonthlyInflation).mockResolvedValue([])
  show()
  expect(await screen.findByText(/Não há meses completos publicados em comum/)).toBeInTheDocument()
  expect(screen.queryByText('Carteira e IPCA')).not.toBeInTheDocument()
})
