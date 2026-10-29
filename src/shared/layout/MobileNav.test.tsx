import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { MobileNav } from './MobileNav'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('reaparece quando o teclado fecha mesmo se o Safari restaurar 793px de 852px', () => {
  const viewport = Object.assign(new EventTarget(), { height: 852 })
  vi.stubGlobal('innerHeight', 852)
  vi.stubGlobal('innerWidth', 393)
  vi.stubGlobal('visualViewport', viewport)
  render(<MemoryRouter><MobileNav alertCount={0} onNovoLancamento={vi.fn()} /></MemoryRouter>)
  const nav = document.querySelector('.mobile-navigation') as HTMLElement
  expect(nav).not.toHaveClass('hidden')

  viewport.height = 476
  act(() => viewport.dispatchEvent(new Event('resize')))
  expect(nav).toHaveClass('hidden')

  viewport.height = 793
  vi.stubGlobal('innerHeight', 793)
  act(() => viewport.dispatchEvent(new Event('resize')))
  expect(nav).not.toHaveClass('hidden')
  expect(nav.style.bottom).toBe('0px')
})
