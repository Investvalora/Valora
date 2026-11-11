import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProventosChart } from './ProventosChart'
import { monthlyIncome } from '../../dividends/utils/monthlyIncome'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const paid = [{ month: '2026-10', total: 50, byAssetType: {} }, { month: '2026-11', total: 30.11, byAssetType: {} }]
const pending = [{ month: '2026-11', total: 40.41, byAssetType: {} }]
it('une meses cronologicamente e mantém parcelas separadas sem alterar os recebidos', () => {
  expect(monthlyIncome(paid, pending)).toEqual([
    { month: '2026-10', received: 50, receivable: 0, total: 50 },
    { month: '2026-11', received: 30.11, receivable: 40.41, total: 70.52 },
  ])
  expect(paid[1].total).toBe(30.11)
})
it('total exibido soma os subtotais visíveis sem alterar a precisão dos dados originais', () => {
  const received = [{ month: '2026-11', total: 30.9249, byAssetType: {} }]
  const receivable = [{ month: '2026-11', total: 40.5549, byAssetType: {} }]
  expect(monthlyIncome(received, receivable)).toEqual([{ month: '2026-11', received: 30.92, receivable: 40.55, total: 71.47 }])
  expect(received[0].total).toBe(30.9249)
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

it('acompanha o apontador e fica contido no gráfico ao aproximar da borda', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 800, height: 300, right: 800, bottom: 300, x: 0, y: 0, toJSON: () => ({}) })
  render(<ProventosChart bars={paid} receivables={pending} />)
  const bar = screen.getByRole('button', { name: /11\/2026/ })
  fireEvent.mouseMove(bar, { clientX: 500, clientY: 40 })
  expect(screen.getByRole('tooltip').style.left).toBe('512px')
  fireEvent.mouseMove(bar, { clientX: 790, clientY: 40 })
  expect(screen.getByRole('tooltip').style.left).toBe('548px')
  fireEvent(window, new Event('resize'))
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
