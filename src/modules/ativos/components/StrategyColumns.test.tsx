import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { AtivosTable } from './AtivosTable'
import { AssetGroupCard } from './AssetGroupCard'
import type { ValuationStrategy } from '../../valuation/hooks/useStrategies'
import type { PositionRow } from '../../portfolio/types'

const strategies: ValuationStrategy[] = [
  { id: 'on', name: 'Minha renda', method: 'bazin', min_dy: 0.08, safety_discount: 0, show_in_assets: true },
  { id: 'off', name: 'Estratégia oculta', method: 'graham', min_dy: 0.06, safety_discount: 0, show_in_assets: false },
]
const row = { id: 'asset', ticker: 'ABC', type: 'stock_us', currency: 'USD', quantity: 1, marketValueBRL: 100, weightPercent: 100, quotePrice: 20, averagePrice: 10, bazinCeiling: 40, changePercent: 0 } as PositionRow

it('adiciona apenas as estratégias marcadas à tabela e remove a coluna ao ocultar', () => {
  const { rerender } = render(<MemoryRouter><AtivosTable rows={[row]} totalBRL={100} strategies={strategies} /></MemoryRouter>)
  expect(screen.getByRole('columnheader', { name: 'Minha renda' })).toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Estratégia oculta' })).not.toBeInTheDocument()
  expect(screen.getByText('$30.00')).toBeInTheDocument()
  rerender(<MemoryRouter><AtivosTable rows={[row]} totalBRL={100} strategies={[]} /></MemoryRouter>)
  expect(screen.queryByRole('columnheader', { name: 'Minha renda' })).not.toBeInTheDocument()
})
it('mostra as mesmas referências nos cards do PWA', () => {
  render(<MemoryRouter><AssetGroupCard type="stock_us" label="Stocks" color="#00ff00" rows={[row]} totalBRL={100} variationPct={0} portfolioPct={100} isExpanded onToggle={() => {}} strategies={strategies} /></MemoryRouter>)
  expect(screen.getByText('Minha renda: $30.00')).toBeInTheDocument()
  expect(screen.queryByText(/Estratégia oculta/)).not.toBeInTheDocument()
})

it('exibe a avaliação das regras próprias sem formatar o resultado como preço', () => {
  const custom: ValuationStrategy = { ...strategies[0], id: 'custom', name: 'Meus critérios', method: 'custom', custom_rules: [{ metric: 'dy', operator: 'gte', min: 6 }], rule_match: 'all' }
  const { rerender } = render(<MemoryRouter><AtivosTable rows={[{ ...row, dy: 7 }]} totalBRL={100} strategies={[custom]} /></MemoryRouter>)
  expect(screen.getByRole('cell', { name: 'Atende' })).toBeInTheDocument()
  rerender(<MemoryRouter><AtivosTable rows={[{ ...row, dy: null }]} totalBRL={100} strategies={[custom]} /></MemoryRouter>)
  expect(screen.getByRole('cell', { name: 'Dados insuficientes' })).toBeInTheDocument()
})

it('posiciona a referência junto aos preços e esconde a estratégia nas classes não escolhidas', () => {
  const s = { ...strategies[0], asset_types: ['stock_us' as const] }
  const { rerender } = render(<MemoryRouter><AtivosTable rows={[row]} totalBRL={100} strategies={[s]} visibleColumns={['ticker', 'quantity', 'quote', 'graham', 'bazin', 'balance']} /></MemoryRouter>)
  const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
  expect(headers.indexOf('Minha renda')).toBe(headers.indexOf('Preço-teto (Bazin)') + 1)
  rerender(<MemoryRouter><AtivosTable rows={[{ ...row, type: 'stock_br' }]} totalBRL={100} strategies={[s]} /></MemoryRouter>)
  expect(screen.queryByRole('columnheader', { name: 'Minha renda' })).not.toBeInTheDocument()
})
