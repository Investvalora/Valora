import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PerformanceLineChart from './PerformanceLineChart'

vi.mock('recharts', () => {
  const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Container, LineChart: Container,
    Line: () => null, XAxis: () => null, YAxis: () => null,
    CartesianGrid: () => null, Legend: () => null,
    Tooltip: ({ content }: { content: ReactElement }) => cloneElement(content, {
      active: true, label: Date.UTC(2026, 10, 1),
      payload: [{ name: 'Carteira', value: 107.42, color: 'blue' }],
    } as object),
  }
})
afterEach(() => vi.restoreAllMocks())

it('mantém o tooltip dentro do trecho visível do gráfico móvel', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const tooltip = this.getAttribute('role') === 'tooltip'
    return { x: tooltip ? 259 : 52, y: 0, left: tooltip ? 259 : 52,
      right: tooltip ? 419 : 403, top: 0, bottom: 130,
      width: tooltip ? 160 : 351, height: 130, toJSON: () => ({}) }
  })
  vi.stubGlobal('innerWidth', 411)
  render(<PerformanceLineChart series={[{ label: 'Carteira', color: 'blue', points: [
    { date: '2026-10-01', normalized: 100 }, { date: '2026-11-01', normalized: 107.42 },
  ] }]} />)
  expect(screen.getByRole('tooltip').style.transform).toBe('translateX(-16px)')
  expect(screen.getByRole('tooltip')).toHaveTextContent('+7,42%')
  vi.unstubAllGlobals()
})
