import { fireEvent, render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { MotionNavLink } from './MotionNavLink'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete document.documentElement.dataset.viewTransition })
function setup() {
  render(<MemoryRouter initialEntries={['/before']}><MotionNavLink to="/after">Ferramentas</MotionNavLink><Routes><Route path="/before" element={<p>Antes</p>} /><Route path="/after" element={<p>Depois</p>} /></Routes></MemoryRouter>)
}
it('navega com teclado mesmo sem suporte a View Transitions', () => {
  setup()
  fireEvent.click(screen.getByRole('link'), { detail: 0 })
  expect(screen.getByText('Depois')).toBeInTheDocument()
})
it('navigates even when a native snapshot would never call the update callback', async () => {
  const start = vi.fn(() => ({ ready: new Promise(() => {}), finished: new Promise(() => {}), skipTransition: vi.fn() } as unknown as ViewTransition))
  Object.defineProperty(document, 'startViewTransition', { configurable: true, writable: true, value: start })
  setup()
  await act(async () => { fireEvent.click(screen.getByRole('link'), { detail: 1 }) })
  expect(start).not.toHaveBeenCalled()
  expect(screen.getAllByText('Depois')).toHaveLength(1)
  expect(screen.queryByText('Antes')).not.toBeInTheDocument()
  delete (document as unknown as Record<string, unknown>).startViewTransition
})
it('mantém movimento reduzido instantâneo mesmo com suporte nativo', () => {
  const start = vi.fn()
  Object.defineProperty(document, 'startViewTransition', { configurable: true, writable: true, value: start })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  setup()
  fireEvent.click(screen.getByRole('link'), { detail: 1 })
  expect(start).not.toHaveBeenCalled()
  expect(screen.getByText('Depois')).toBeInTheDocument()
  delete (document as unknown as Record<string, unknown>).startViewTransition
})
