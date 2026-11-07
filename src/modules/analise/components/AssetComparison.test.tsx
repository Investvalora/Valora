import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AssetComparison } from './AssetComparison'

const fixture = vi.hoisted(() => ({ error: false }))
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: [
  { ticker: 'A', name: 'Empresa A', type: 'stock_br', currency: 'BRL' },
  { ticker: 'F', name: 'Fundo F', type: 'fii', currency: 'BRL' },
  { ticker: 'B', name: 'Empresa B', type: 'stock_us', currency: 'USD' },
  { ticker: 'C', name: 'Empresa C', type: 'stock_br', currency: 'BRL' },
], isFetching: false }) }))
vi.mock('../../score/hooks/useFundamentals', () => ({ useFundamentals: () => ({ isError: fixture.error, data: [
  { ticker: 'A', pl: 0, pvp: 1, roe: 12, source: 'yahoo', reference_date: '2026-11-06' },
  { ticker: 'F', pl: 50, pvp: null, roe: 99, source: 'yahoo', reference_date: '2026-11-05' },
] }) }))
beforeEach(() => { fixture.error = false })
function select(name: string) {
  fireEvent.change(screen.getByLabelText('Buscar por ticker ou nome'), { target: { value: 'AA' } })
  fireEvent.click(screen.getByRole('button', { name }))
}
it('compara sem posição, preservando zero, ausência e não aplicabilidade', () => {
  render(<MemoryRouter><AssetComparison /></MemoryRouter>)
  select('A · Empresa A · BRL')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  select('F · Fundo F · BRL')
  const table = screen.getByRole('table')
  expect(within(table).getByText('0×')).toBeInTheDocument()
  expect(within(table).getByText('12%')).toBeInTheDocument()
  expect(within(table).queryByText('99%')).not.toBeInTheDocument()
  expect(within(table).getAllByText('Não se aplica').length).toBeGreaterThan(0)
  expect(within(table).getAllByText('Indisponível').length).toBeGreaterThan(0)
  expect(within(table).getByText('2026-11-05 · yahoo')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remover A' }))
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
it('mostra falha de consulta em vez de valores parciais silenciosos', () => {
  fixture.error = true
  render(<MemoryRouter><AssetComparison /></MemoryRouter>)
  select('A · Empresa A · BRL'); select('F · Fundo F · BRL')
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
it('impede repetidos e limita a seleção a quatro sem remover os escolhidos', () => {
  render(<MemoryRouter><AssetComparison /></MemoryRouter>)
  select('A · Empresa A · BRL')
  fireEvent.change(screen.getByLabelText('Buscar por ticker ou nome'), { target: { value: 'AA' } })
  expect(screen.getByRole('button', { name: 'A · Empresa A · BRL' })).toBeDisabled()
  select('F · Fundo F · BRL'); select('B · Empresa B · USD'); select('C · Empresa C · BRL')
  expect(screen.getByLabelText('Buscar por ticker ou nome')).toBeDisabled()
  expect(screen.getAllByRole('button', { name: /^Remover / })).toHaveLength(4)
  fireEvent.click(screen.getByRole('button', { name: 'Remover C' }))
  expect(screen.getByLabelText('Buscar por ticker ou nome')).not.toBeDisabled()
})
