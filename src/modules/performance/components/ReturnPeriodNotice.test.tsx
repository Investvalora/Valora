import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReturnPeriodNotice } from './ReturnPeriodNotice'

afterEach(() => { cleanup(); vi.useRealTimers() })
it('distingue data histórica, período inicial e ausência de período sem prometer fechamento inexistente', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T12:00:00Z'))
  const { rerender } = render(<ReturnPeriodNotice endDate="2026-10-31" />)
  expect(screen.getByText(/até 31\/10\/2026/)).toHaveTextContent('Considera meses encerrados')
  rerender(<ReturnPeriodNotice endDate="2026-11-10" />)
  expect(screen.getByText(/até 10\/11\/2026/)).toHaveTextContent('Período inicial parcial')
  rerender(<ReturnPeriodNotice />)
  expect(screen.getByText(/sem período disponível/)).not.toHaveTextContent('Considera meses encerrados')
})
