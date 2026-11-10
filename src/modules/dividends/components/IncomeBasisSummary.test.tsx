import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { IncomeBasisSummary } from './IncomeBasisSummary'
import type { DividendRow } from '../types'

it('separa líquido importado de estimativa bruta sem inferir retenção', () => {
  render(<IncomeBasisSummary rows={[
    {ticker:'TFLO',source:'imported',total_value:1.86},
    {ticker:'JPM',total_value:0.735},
  ] as DividendRow[]} />)
  expect(screen.getByLabelText('Base dos proventos')).toHaveTextContent('Líquidos importados: R$ 1,86')
  expect(screen.getByLabelText('Base dos proventos')).toHaveTextContent('Estimativas brutas: R$ 0,74')
  expect(screen.getByText(/sem confirmação do líquido/)).toBeInTheDocument()
})
