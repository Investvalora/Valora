import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
it('preserva alerta editado, encerra somente automático conhecido e não consulta cripto', async () => {
  let handler!: (request: Request) => Promise<Response>
  const patches: Array<{ url: string; body: unknown }> = []
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://db.test' : 'service' }, serve: (callback: typeof handler) => { handler = callback } })
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'owner' })
    if (url.includes('/positions?')) return Response.json([
      { ticker: 'KO', assets: { type: 'stock_us', currency: 'USD' } },
      { ticker: 'AAPL', assets: { type: 'stock_us', currency: 'USD' } },
      { ticker: 'ETH', assets: { type: 'crypto', currency: 'USD' } },
    ])
    if (url.includes('/transactions?')) return Response.json(['KO', 'AAPL', 'ETH'].map(ticker => ({ ticker })))
    if (url.includes('/price_history?')) {
      const ticker = /ticker=eq.([^&]+)/.exec(url)![1]
      return Response.json([{ ticker, date: new Date().toISOString().slice(0, 10), close: ticker === 'KO' ? 50 : 100 }])
    }
    if (url.includes('finance.yahoo.com')) {
      expect(url).not.toContain('/ETH?')
      return Response.json({ chart: { result: [{ events: { dividends: { d: { amount: 6 } } } }] } })
    }
    if (init?.method === 'PATCH') { patches.push({ url, body: JSON.parse(String(init.body)) }); return new Response(null, { status: 204 }) }
    if (url.includes('/alerts?')) {
      expect(url).toContain('user_id=eq.owner')
      if (url.includes('auto_managed=eq.true')) return Response.json([{ id: 'old-auto', type: 'opportunity', ticker: 'AAPL' }])
      return Response.json([{ id: 'edited', auto_managed: false, status: 'lido' }])
    }
    throw new Error('Unexpected operation')
  })
  vi.stubGlobal('fetch', fetcher)
  await import('../../../supabase/functions/generate-alerts/index.ts')
  const response = await handler(new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer user-session' } }))
  expect(response.status).toBe(200)
  expect(patches).toEqual([{ url: expect.stringContaining('id=eq.old-auto&user_id=eq.owner&auto_managed=eq.true'), body: { status: 'ignorado' } }])
  expect(patches.some(patch => patch.url.includes('edited'))).toBe(false)
})
