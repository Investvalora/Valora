import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { MobileNav } from './MobileNav'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('reaparece quando o teclado fecha mesmo se o Safari restaurar 793px de 852px', () => {
  const viewport = Object.assign(new EventTarget(), { height: 852 })
  vi.stubGlobal('innerHeight', 852)
  vi.stubGlobal('innerWidth', 393)
  vi.stubGlobal('visualViewport', viewport)
  render(<MemoryRouter><input aria-label="Quantidade"/><MobileNav alertCount={0} onNovoLancamento={vi.fn()} /></MemoryRouter>)
  const nav = document.querySelector('.mobile-navigation') as HTMLElement
  expect(nav).not.toHaveClass('hidden')

  act(() => screen.getByLabelText('Quantidade').focus())
  viewport.height = 476
  act(() => viewport.dispatchEvent(new Event('resize')))
  expect(nav).toHaveClass('hidden')

  viewport.height = 793
  vi.stubGlobal('innerHeight', 793)
  act(() => viewport.dispatchEvent(new Event('resize')))
  expect(nav).not.toHaveClass('hidden')
  expect(nav.style.bottom).toBe('0px')
})

it('não oculta navegação ao reduzir altura sem um campo em edição', () => {
  const viewport = Object.assign(new EventTarget(), { height: 1100 })
  vi.stubGlobal('innerHeight',1100); vi.stubGlobal('innerWidth',390); vi.stubGlobal('visualViewport',viewport)
  render(<MemoryRouter><MobileNav alertCount={0} onNovoLancamento={vi.fn()}/></MemoryRouter>)
  viewport.height=740; vi.stubGlobal('innerHeight',740)
  act(()=>viewport.dispatchEvent(new Event('resize')))
  expect(document.querySelector('.mobile-navigation')).not.toHaveClass('hidden')
})
