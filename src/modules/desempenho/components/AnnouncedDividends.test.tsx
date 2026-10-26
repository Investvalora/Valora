import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AnnouncedDividends } from './AnnouncedDividends'
vi.mock('../../dividends/hooks/useDividends', () => ({ useDividends: () => ({ rows: [
  { ticker: 'AAA3', type: 'dividend', ex_date: '2026-01-01', payment_date: null, quantity: 10, value_per_share: 1, total_value: 10, currency: 'BRL' },
  { ticker: 'BBB', type: 'dividend', ex_date: '2099-01-01', payment_date: '2099-02-01', quantity: 2, value_per_share: 1, total_value: 2, currency: 'USD' },
], isLoading: false, isError: false }) }))
it('separa data ausente de pagamento futuro e preserva a moeda do ativo', () => {
  render(<AnnouncedDividends />)
  const unknown = screen.getByRole('heading', { name: 'AAA3 · DIVIDEND' }).closest('article')!
  const future = screen.getByRole('heading', { name: 'BBB · DIVIDEND' }).closest('article')!
  expect(within(unknown).getByText('Pode já ter sido pago. Ausência de data não comprova um valor a receber.')).toBeInTheDocument()
  expect(unknown).toHaveTextContent('Valor de referência')
  expect(future).toHaveTextContent('US$ 2,00')
  expect(future).toHaveTextContent('Direito ainda não consolidado')
})
