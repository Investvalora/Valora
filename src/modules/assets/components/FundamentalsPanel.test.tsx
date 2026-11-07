import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FundamentalsPanel } from './FundamentalsPanel'
import type { FundamentalsRow } from '../../score/types'
const row: FundamentalsRow = { ticker: 'A', reference_date: '2026-10-30', updated_at: '', pl: 0, pvp: 1.2, dy: 6.5, roe: null, net_margin: null, debt_equity: null }
it('preserva zero, percentuais e a ausência de dados separadamente', () => {
  render(<FundamentalsPanel row={row} type="stock_br" />)
  expect(screen.getByText('0')).toBeInTheDocument()
  expect(screen.getByText('6,5%')).toBeInTheDocument()
  expect(screen.getAllByText('Indisponível')).toHaveLength(3)
  expect(screen.getByText(/30\/10\/2026/)).toBeInTheDocument()
})
it('não aplica indicadores de empresas a fundos nem criptomoedas', () => {
  const view = render(<FundamentalsPanel row={row} type="fii" />)
  expect(screen.getAllByText('Não se aplica')).toHaveLength(4)
  expect(screen.getByText('1,2')).toBeInTheDocument()
  view.rerender(<FundamentalsPanel row={row} type="crypto" />)
  expect(screen.getAllByText('Não se aplica')).toHaveLength(6)
})
it('distingue falha de consulta de falta de dados', () => {
  render(<FundamentalsPanel row={null} type="stock_br" error />)
  expect(within(screen.getByRole('alert')).getByText(/Não foi possível/)).toBeInTheDocument()
  expect(screen.queryByText('Indisponível')).not.toBeInTheDocument()
})
