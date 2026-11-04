import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it('sync keeps BRL and USD quotes separate and never substitutes USD when BRL is absent', async () => {
  let handler: ((request: Request) => Promise<Response>) | undefined
  vi.stubGlobal('Deno', { env: { get: () => 'test-only' }, serve: (callback: typeof handler) => { handler = callback } })
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return new Response(null, { status: 204 })
    if (url.includes('/rest/v1/assets')) return new Response(JSON.stringify([
      { ticker: 'BTC', provider_symbol: 'bitcoin', quote_provider: 'coingecko', currency: 'USD' },
      { ticker: 'BTC-BRL', provider_symbol: 'bitcoin', quote_provider: 'coingecko', currency: 'BRL' },
      { ticker: 'ETH-BRL', provider_symbol: 'ethereum', quote_provider: 'coingecko', currency: 'BRL' },
    ]))
    expect(url).toContain('vs_currencies=usd,brl')
    return new Response(JSON.stringify({ bitcoin: { usd: 70000, brl: 350000, last_updated_at: Math.floor(Date.now()/1000) }, ethereum: { usd: 3000, last_updated_at: Math.floor(Date.now()/1000) } }))
  })
  vi.stubGlobal('fetch', fetchMock)
  const path = '../../../../supabase/functions/sync-global-assets/index.ts'
  await import(path)
  const response = await handler!(new Request('https://test/', { method: 'POST', headers: { Authorization: 'Bearer test-only' }, body: '{}' }))
  expect(await response.json()).toMatchObject({ success: 2, failed: 1 })
  const upserts = fetchMock.mock.calls.filter(call => call[0].includes('/rpc/store_global_quote')).map(call => JSON.parse(String(call[1]?.body)).p_quote)
  expect(upserts).toEqual([
    expect.objectContaining({ ticker: 'BTC', close: 70000 }),
    expect.objectContaining({ ticker: 'BTC-BRL', close: 350000 }),
  ])
  expect(response.status).toBe(503)
})
