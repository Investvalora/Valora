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

it('mantém uma coluna no viewport pequeno e reserva rolagem para muitos meses', () => {
  const { rerender } = render(<EvolucaoChart data={[{ month: '2026-10', totalBRL: 4237.88, investedBRL: 4000 }]} />)
  const svg = screen.getByRole('group', { name: 'Gráfico de evolução do patrimônio' })
  expect(svg).toHaveStyle({ minWidth: '320px' })
  expect(svg.getAttribute('viewBox')).toBe('0 0 320 332')
  expect(Number(screen.getByRole('button').querySelector('text')?.getAttribute('x'))).toBeLessThan(320)
  rerender(<EvolucaoChart data={Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, totalBRL: 100, investedBRL: 90 }))} />)
  expect(svg).toHaveStyle({ minWidth: '1026px' })
  expect(screen.getAllByRole('button')).toHaveLength(12)
})
