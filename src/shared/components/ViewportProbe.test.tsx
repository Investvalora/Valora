import { afterEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

it('registra a abertura e o fechamento do teclado em JSON sem valores digitados', async () => {
  vi.stubEnv('VITE_VIEWPORT_PROBE', '1')
  vi.resetModules()
  const { ViewportProbe } = await import('./ViewportProbe')
  const viewport = Object.assign(new EventTarget(), {
    height: 800,
    width: 390,
    offsetTop: 0,
  })
  vi.stubGlobal('visualViewport', viewport)
  render(<><input id="campo" defaultValue="valor privado" /><ViewportProbe /></>)

  fireEvent.click(screen.getByRole('button', { name: 'Medir' }))
  viewport.height = 430
  viewport.offsetTop = 142
  act(() => viewport.dispatchEvent(new Event('resize')))
  const dismiss = screen.getByRole('button', { name: 'Dispensar teclado' })
  expect(dismiss.parentElement?.style.top).toContain('142px')
  viewport.height = 800
  viewport.offsetTop = 0
  act(() => viewport.dispatchEvent(new Event('resize')))

  const raw = sessionStorage.getItem('valora:viewport-probe') ?? ''
  const samples = JSON.parse(raw) as Array<{ phase: string }>
  expect(samples.map((sample) => sample.phase)).toEqual(['start', 'keyboard-open', 'keyboard-dismissed'])
  expect(raw).not.toContain('valor privado')
})
