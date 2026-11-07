import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it.each(['sync-b3-prices', 'sync-bolsai-fundamentals'])('protege %s antes de ler catálogo ou chamar provedor', async (name) => {
  let handler: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', {
    env: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://db.test' : 'runtime-service' },
    serve: (callback: typeof handler) => { handler = callback },
  })
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/rpc/authorize_market_job')) {
      const { token_digest } = JSON.parse(String(options?.body))
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vault-service')))].map(b => b.toString(16).padStart(2, '0')).join('')
      return new Response(JSON.stringify(token_digest === digest))
    }
    if (url.includes('/assets?')) return new Response('[]')
    throw new Error('No provider calls expected')
  })
  vi.stubGlobal('fetch', fetchMock)
  const modulePath = `../../../../supabase/functions/${name}/index.ts`
  await import(/* @vite-ignore */ modulePath)
  const request = (token?: string) => new Request('https://test/', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  for (const token of [undefined, 'ordinary-user-jwt', 'fake-service-role-jwt']) {
    expect((await handler!(request(token))).status).toBe(401)
  }
  expect(fetchMock.mock.calls.every(([url]) => url.endsWith('/rpc/authorize_market_job'))).toBe(true)
  expect((await handler!(request('runtime-service'))).status).toBe(200)
  expect((await handler!(request('vault-service'))).status).toBe(200)
  expect(fetchMock.mock.calls.some(([url]) => url.includes('/assets?'))).toBe(true)
})
