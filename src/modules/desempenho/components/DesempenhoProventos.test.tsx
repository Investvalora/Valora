import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DividendRow } from '../../dividends/types'
import { DesempenhoProventos } from './DesempenhoProventos'

const mocks = vi.hoisted(() => ({ error: false }))
const row = (ticker: string, total_value: number, type = 'dividend'): DividendRow => ({ ticker, type, total_value, quantity: 1, value_per_share: total_value, ex_date: '2026-10-30', payment_date: '2026-11-09', currency: 'BRL' })
vi.mock('../../dividends/hooks/useBrlDividends', () => ({ useBrlDividends: () => ({ rows: [row('AAA', 20), row('BBB', 10, 'jcp')], isLoading: false, isError: false, refetch: vi.fn(), availableTypes: ['dividend', 'jcp'] }) }))
vi.mock('../../dividends/hooks/useMonthReceivables', () => ({ useMonthReceivables: () => ({ rows: [row('AAA', 40), row('BBB', 5, 'jcp')], isLoading: false, isError: mocks.error, hasUndated: true, refetch: vi.fn() }) }))
vi.mock('../../dividends/hooks/useDividends', () => ({ useSyncDividends: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('./AnnouncedDividends', () => ({ AnnouncedDividends: () => <div>Anúncios</div> }))
afterEach(() => { cleanup(); mocks.error = false })

it('filtra recebido e a receber juntos sem somar previsão no KPI', async () => {
  render(<DesempenhoProventos />)
  expect(await screen.findByRole('button', { name: /11\/2026:.*receber R\$\s*45,00.*recebidos R\$\s*30,00.*total R\$\s*75,00/ })).toBeInTheDocument()
  expect(screen.getAllByText(/R\$\s*30,00/).length).toBeGreaterThan(0)
  fireEvent.change(screen.getByPlaceholderText('Buscar ticker…'), { target: { value: 'AAA' } })
  await waitFor(() => expect(screen.getByRole('button', { name: /11\/2026:.*receber R\$\s*40,00.*recebidos R\$\s*20,00.*total R\$\s*60,00/ })).toBeInTheDocument())
  expect(screen.getAllByText(/R\$\s*30,00/).length).toBeGreaterThan(0)
  fireEvent.change(screen.getByPlaceholderText('Buscar ticker…'), { target: { value: '' } })
  fireEvent.change(screen.getByDisplayValue('Todos os tipos'), { target: { value: 'jcp' } })
  expect(screen.getByRole('button', { name: /11\/2026:.*receber R\$\s*5,00.*recebidos R\$\s*10,00.*total R\$\s*15,00/ })).toBeInTheDocument()
})

it('falha de previsão mantém recebido visível e informa cobertura incompleta', async () => {
  mocks.error = true
  render(<DesempenhoProventos />)
  expect(await screen.findByRole('button', { name: /11\/2026:.*receber R\$\s*0,00.*recebidos R\$\s*30,00/ })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Previsão indisponível')
  expect(screen.getByText(/Há anúncios sem data de pagamento/)).toBeInTheDocument()
})

