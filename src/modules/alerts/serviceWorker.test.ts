// @vitest-environment node
import { expect, it, vi } from 'vitest'
import source from '../../../public/sw.js?raw'

function worker(windows: unknown[]) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const openWindow = vi.fn().mockResolvedValue({})
  const initialize = new Function('self', 'URL', source)
  initialize({
      location: { origin: 'https://valora.test' },
      clients: { matchAll: vi.fn().mockResolvedValue(windows), openWindow },
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler },
  }, URL)
  return {
    openWindow,
    async click() {
      let done: Promise<unknown> | undefined
      handlers.notificationclick({ notification: { close: vi.fn() }, waitUntil: (promise: Promise<unknown>) => { done = promise } })
      await done
    },
  }
}

it('abre Alertas quando não há janela da origem', async () => {
  const sw = worker([{ url: 'https://other.test' }])
  await sw.click()
  expect(sw.openWindow).toHaveBeenCalledWith('https://valora.test/alertas')
})

it('foca antes de navegar e prioriza a janela visível', async () => {
  const navigate = vi.fn().mockResolvedValue({})
  const focus = vi.fn().mockResolvedValue({ navigate })
  const hiddenFocus = vi.fn()
  const sw = worker([
    { url: 'https://valora.test/inicio', visibilityState: 'hidden', focus: hiddenFocus },
    { url: 'https://valora.test/ativos', visibilityState: 'visible', focus },
  ])
  await sw.click()
  expect(focus).toHaveBeenCalledOnce()
  expect(navigate).toHaveBeenCalledWith('https://valora.test/alertas')
  expect(hiddenFocus).not.toHaveBeenCalled()
  expect(sw.openWindow).not.toHaveBeenCalled()
})

it.each(['focus', 'navigate', 'discarded'])('abre alternativa se o cliente falhar em %s', async (failure) => {
  const navigate = failure === 'navigate'
    ? vi.fn().mockRejectedValue(new Error('Discarded'))
    : vi.fn().mockResolvedValue(null)
  const focus = failure === 'focus'
    ? vi.fn().mockRejectedValue(new Error('Cannot focus'))
    : vi.fn().mockResolvedValue({ navigate })
  const sw = worker([{ url: 'https://valora.test/inicio', focus }])
  await sw.click()
  expect(sw.openWindow).toHaveBeenCalledWith('https://valora.test/alertas')
})
