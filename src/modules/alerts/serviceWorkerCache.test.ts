// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import source from '../../../public/sw.js?raw'

function worker(initial?: Response) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const entries = new Map<string, Response>()
  if (initial) entries.set('/assets/page.js', initial)
  const key = (request: string | Request) => typeof request === 'string' ? request : new URL(request.url).pathname
  const cache = {
    match: vi.fn(async (request: string | Request) => entries.get(key(request))),
    put: vi.fn(async (request: string | Request, response: Response) => { entries.set(key(request), response) }),
    delete: vi.fn(async (request: string | Request) => entries.delete(key(request))),
  }
  const fetch = vi.fn().mockResolvedValue(new Response('export default 1', { headers: { 'content-type': 'application/javascript' } }))
  const skipWaiting = vi.fn()
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['valora-static-old', 'valora-static-v1', 'other']), delete: vi.fn() }
  new Function('self', 'caches', 'fetch', 'Response', source)({
    location: { origin: 'https://valora.test' }, skipWaiting,
    clients: { claim: vi.fn() },
    addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler },
  }, caches, fetch, Response)
  return {
    cache, caches, fetch, skipWaiting,
    async asset(path = '/assets/page.js') {
      let response: Promise<Response> | undefined
      handlers.fetch({ request: new Request(`https://valora.test${path}`), respondWith: (value: Promise<Response>) => { response = value } })
      return await response
    },
    async lifecycle(name: string) {
      const promises: Promise<unknown>[] = []
      handlers[name]({ waitUntil: (value: Promise<unknown>) => promises.push(value) })
      await Promise.all(promises)
    },
  }
}
const html = () => new Response('<html>app</html>', { headers: { 'content-type': 'text/html' } })

describe('cache de assets do PWA', () => {
  it('remove HTML contaminado e recupera JavaScript pela rede sem cache HTTP', async () => {
    const sw = worker(html())
    expect(await (await sw.asset())?.text()).toBe('export default 1')
    expect(sw.cache.delete).toHaveBeenCalledOnce()
    expect(sw.fetch).toHaveBeenCalledWith(expect.any(Request), { cache: 'reload' })
    expect(sw.cache.put).toHaveBeenCalledOnce()
  })
  it('preserva JavaScript válido offline', async () => {
    const sw = worker(new Response('cached', { headers: { 'content-type': 'text/javascript; charset=utf-8' } }))
    sw.fetch.mockRejectedValue(new Error('offline'))
    expect(await (await sw.asset())?.text()).toBe('cached')
    expect(sw.fetch).not.toHaveBeenCalled()
  })
  it('não entrega nem armazena HTML retornado pela rede para um chunk', async () => {
    const sw = worker()
    sw.fetch.mockResolvedValue(html())
    expect((await sw.asset())?.type).toBe('error')
    expect(sw.cache.put).not.toHaveBeenCalled()
  })
  it('não reutiliza outro cache e falha offline sem devolver HTML contaminado', async () => {
    const sw = worker(html())
    sw.fetch.mockRejectedValue(new Error('offline'))
    await expect(sw.asset()).rejects.toThrow('offline')
    expect(sw.caches.open).toHaveBeenCalledWith('valora-static-v1')
    expect(sw.cache.delete).toHaveBeenCalledOnce()
  })
  it('rejeita MIME incorreto para CSS', async () => {
    const sw = worker()
    expect((await sw.asset('/assets/page.css'))?.type).toBe('error')
    expect(sw.cache.put).not.toHaveBeenCalled()
  })
  it('valida o shell antes de ativar a atualização', async () => {
    const sw = worker()
    await expect(sw.lifecycle('install')).rejects.toThrow('Invalid PWA asset')
    expect(sw.skipWaiting).not.toHaveBeenCalled()
    expect(sw.cache.put).not.toHaveBeenCalled()
    sw.fetch.mockResolvedValue(html())
    await sw.lifecycle('install')
    expect(sw.skipWaiting).toHaveBeenCalledOnce()
  })
  it('remove apenas caches antigos do Valora ao ativar', async () => {
    const sw = worker()
    await sw.lifecycle('activate')
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('valora-static-old')
  })
})
