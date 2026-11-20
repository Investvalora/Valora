import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MiniBarChart, ProventosCol } from './ProventosCol'
const dividends = vi.hoisted(() => ({ isLoading: false, isError: false }))
vi.mock('../../dividends/hooks/useBrlDividends', () => ({ useBrlDividends: () => ({
  ...dividends,
  rows: [{ ticker: 'BR', ex_date: '2026-10-01', payment_date: '2026-10-02', total_value: 12.34 }],
  refetch: vi.fn(),
}) }))

it('totaliza somente os proventos convertidos, sem montar o histórico do dashboard', () => {
  render(<ProventosCol />)
  expect(screen.getByText('Total recebido (12M)')).toBeVisible()
  expect(screen.getAllByText(/R\$\s*12,34/)).toHaveLength(2)
})

it('não apresenta total disponível quando proventos ou câmbio estão incompletos', () => {
  dividends.isError = true
  render(<ProventosCol />)
  expect(screen.getByRole('alert')).toHaveTextContent('Dados ou câmbio histórico indisponíveis')
  expect(screen.getByText('Total recebido (12M)').parentElement?.parentElement).not.toHaveTextContent(/R\$\s*12,34/)
  dividends.isError = false
})
it('mostra o valor exato de cada mês no mouse, teclado e toque', () => {
  render(<MiniBarChart months={[{ month: '2026-10', total: 12.34 }, { month: '2026-11', total: 71.4 }]} />)
  const october = screen.getByRole('button', { name: /Out\/2026: R\$\s*12,34/ })
  fireEvent.mouseEnter(october)
  expect(screen.getByRole('status')).toHaveTextContent(/Out\/2026: R\$\s*12,34/)
  fireEvent.focus(screen.getByRole('button', { name: /Nov\/2026/ }))
  expect(screen.getByRole('status')).toHaveTextContent(/Nov\/2026: R\$\s*71,40/)
  fireEvent.keyDown(screen.getByRole('button', { name: /Nov\/2026/ }), { key: 'Escape' })
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  fireEvent.click(october)
  expect(screen.getByRole('status')).toHaveTextContent(/12,34/)
})
