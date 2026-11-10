import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ProventosChart } from './ProventosChart'
import { monthlyIncome } from '../../dividends/utils/monthlyIncome'

afterEach(cleanup)
const paid = [{ month: '2026-10', total: 50, byAssetType: {} }, { month: '2026-11', total: 30.11, byAssetType: {} }]
const pending = [{ month: '2026-11', total: 40.41, byAssetType: {} }]
it('une meses cronologicamente e mantém parcelas separadas sem alterar os recebidos', () => {
  expect(monthlyIncome(paid, pending)).toEqual([
    { month: '2026-10', received: 50, receivable: 0, total: 50 },
    { month: '2026-11', received: 30.11, receivable: 40.41, total: 70.52 },
  ])
  expect(paid[1].total).toBe(30.11)
})
it('permite tocar na barra e conferir as parcelas, e fechar pelo teclado', () => {
  render(<ProventosChart bars={paid} receivables={pending} />)
  fireEvent.click(screen.getByRole('button', { name: /11\/2026/ }))
  const tooltip = within(screen.getByRole('tooltip'))
  expect(tooltip.getByText(/40,41/)).toBeInTheDocument()
  expect(tooltip.getByText(/30,11/)).toBeInTheDocument()
  expect(tooltip.getByText(/70,52/)).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('button', { name: /11\/2026/ }), { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
