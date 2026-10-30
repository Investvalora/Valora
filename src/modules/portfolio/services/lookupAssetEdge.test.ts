import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it.each([['RADL3', 'RADL3.SA', 'EQUITY', 'stock_br'], ['BOVA11', 'BOVA11.SA', 'ETF', 'etf_br']])('consulta fonte gratuita no primeiro pedido de %s quando a Brapi limita chamadas', async (ticker, symbol, instrumentType, type) => {
  let handler!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (name: string) => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service', BRAPI_API_KEY: 'limited' })[name] }, serve: (value: typeof handler) => { handler = value } })
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/v1/user')) return new Response('{"id":"owner"}')
    if (url.includes('brapi.dev')) return new Response('{}', { status: 429 })
    if (url.includes('finance.yahoo.com')) return new Response(JSON.stringify({ chart: { result: [{ meta: { symbol, regularMarketPrice: 12, currency: 'BRL', longName: 'Nome público', instrumentType } }] } }))
    if (url.startsWith('https://db.test/rest/v1/assets')) return new Response(init?.method === 'POST' ? `[${String(init.body)}]` : '[]')
    throw new Error('unexpected request')
  })
  vi.stubGlobal('fetch', fetcher)
  await import('../../../../supabase/functions/lookup-asset/index.ts')
  const response = await handler(new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer session' }, body: JSON.stringify({ ticker }) }))
  expect(response.status).toBe(201)
  expect(await response.json()).toMatchObject({ ticker, type, currency: 'BRL', latestPrice: 12, created: true })
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
})
