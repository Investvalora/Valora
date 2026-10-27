import { expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EvolucaoChart } from './EvolucaoChart'

it('mostra valores no hover, foco e toque e fecha ao sair ou pressionar Escape', () => {
  render(<EvolucaoChart data={[{ month: '2026-09', totalBRL: 120, investedBRL: 100 }]} />)
  const bar = screen.getByRole('button', { name: /set\/26: Patrimônio/ })
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.pointerEnter(bar)
  expect(screen.getByRole('tooltip')).toHaveTextContent('Patrimônio: R$ 120,00')
  expect(screen.getByRole('tooltip')).toHaveTextContent('Valor aplicado: R$ 100,00')
  expect(screen.getByRole('tooltip')).toHaveTextContent('Ganho de capital: R$ 20,00')
  fireEvent.pointerLeave(screen.getByRole('group', { name: 'Gráfico de evolução do patrimônio' }))
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.focus(bar)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.keyDown(bar, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.click(bar)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
})
