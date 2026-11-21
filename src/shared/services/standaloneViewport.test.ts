import { afterEach, expect, it, vi } from 'vitest'
import { startStandaloneViewport } from './standaloneViewport'

let stop: (() => void) | undefined
const height = () => document.documentElement.style.getPropertyValue('--valora-pwa-height')
function installed(nativeTop = 0) {
  document.documentElement.classList.add('ios-standalone')
  vi.stubGlobal('innerHeight', 793)
  vi.stubGlobal('innerWidth', 393)
  vi.stubGlobal('screen', { height: 852 })
  const viewport = Object.assign(new EventTarget(), { height: 793 })
  vi.stubGlobal('visualViewport', viewport)
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ paddingTop: `${nativeTop}px` } as CSSStyleDeclaration)
  stop = startStandaloneViewport()
  return viewport
}
afterEach(() => {
  stop?.()
  stop = undefined
  document.documentElement.classList.remove('ios-standalone')
  document.documentElement.style.removeProperty('--valora-pwa-height')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('usa os 793px úteis da instalação nova sem somar 59px no topo nem usar 852px para a navbar', () => {
  installed()
  expect(height()).toBe('793px')
  expect(document.documentElement.style.getPropertyValue('--valora-safe-area-top')).toBe('')
})

it('usa o inset nativo sem somar espaço em instalações antigas', () => {
  installed(59)
  expect(height()).toBe('')
})

it('não modifica a versão web e acompanha a altura real da janela no PWA opaco', () => {
  stop = startStandaloneViewport()
  expect(height()).toBe('')
  stop()
  installed()
  vi.stubGlobal('innerHeight', 400)
  window.dispatchEvent(new Event('resize'))
  expect(height()).toBe('400px')
})

it('não desloca o cabeçalho ao abrir o teclado e atualiza após girar o dispositivo', () => {
  const viewport = installed()
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()
  viewport.height = 476
  vi.stubGlobal('innerHeight', 476)
  viewport.dispatchEvent(new Event('resize'))
  expect(height()).toBe('793px')
  input.blur()
  input.remove()
  vi.stubGlobal('innerWidth', 852)
  vi.stubGlobal('innerHeight', 393)
  vi.stubGlobal('screen', { height: 393 })
  window.dispatchEvent(new Event('resize'))
  expect(height()).toBe('393px')
})

it('remove os listeners e restaura o valor anterior ao encerrar', () => {
  document.documentElement.style.setProperty('--valora-pwa-height', '800px')
  installed()
  stop!()
  stop = undefined
  expect(height()).toBe('800px')
  window.dispatchEvent(new Event('resize'))
  expect(height()).toBe('800px')
})
