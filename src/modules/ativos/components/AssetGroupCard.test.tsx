import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { AssetGroupCard } from './AssetGroupCard'
import type { PositionRow } from '../../portfolio/types'

it('permite abrir o resumo pelo ticker no card mobile', () => {
  const row = { id: '1', ticker: 'MXRF11', type: 'fii', name: 'Maxi Renda', marketValueBRL: 100, changePercent: 1 } as PositionRow
  render(<MemoryRouter><AssetGroupCard type="fii" label="FIIs" color="#22cc66" totalBRL={100} variationPct={1} portfolioPct={100} rows={[row]} isExpanded onToggle={() => {}} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Ver resumo de MXRF11' })).toHaveAttribute('href', '/ativo/mxrf11')
})
