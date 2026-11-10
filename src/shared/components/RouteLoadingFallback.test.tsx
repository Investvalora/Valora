import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RouteLoadingFallback } from './RouteLoadingFallback'
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it('oferece recuperação explícita após demora sem recarregar automaticamente', () => {
  vi.useFakeTimers()
  render(<RouteLoadingFallback />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  act(() => vi.advanceTimersByTime(15000))
  expect(screen.getByRole('status')).toHaveTextContent('demorando')
  expect(screen.getByRole('button')).toHaveTextContent('Recarregar aplicativo')
})
it('informa offline e acompanha a reconexão', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  render(<RouteLoadingFallback />)
  expect(screen.getByRole('status')).toHaveTextContent('Sem conexão')
  online.mockReturnValue(true)
  act(() => window.dispatchEvent(new Event('online')))
  expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
