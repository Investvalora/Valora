import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
it.each([
  [{ defaultKeyStatistics: { bookValue: { raw: -1.446 }, trailingEps: { raw: 12 } }, summaryDetail: { dividendYield: { raw: 0.025 } } }, -1.446, 2.5],
  [{ defaultKeyStatistics: {}, summaryDetail: { dividendYield: { raw: 0.1 } } }, null, 10],
])('salva indicadores disponíveis e mantém ausentes como null', async (result, vpa, dy) => {
  let handler!: (request: Request) => Promise<Response>
  let rows: unknown
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://db.test' : 'service' }, serve: (callback: typeof handler) => { handler = callback } })
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/assets?')) return Response.json([{ ticker: 'MCD', currency: 'USD' }])
    if (url === 'https://fc.yahoo.com') return new Response('')
    if (url.includes('/getcrumb')) return new Response('crumb')
    if (url.includes('/quoteSummary/')) return Response.json({ quoteSummary: { result: [result] } })
    if (url.includes('/fundamentals?')) { rows = JSON.parse(String(init?.body)); return new Response(null, { status: 201 }) }
    throw new Error('Unexpected operation')
  }))
  await import('../../../supabase/functions/sync-yahoo-fundamentals/index.ts')
  const response = await handler(new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer service' }, body: '{"tickers":["MCD"]}' }))
  expect(response.status).toBe(200)
  expect(rows).toEqual([expect.objectContaining({ ticker: 'MCD', vpa, dy, pvp: null, roe: null, debt_equity: null, net_margin: null, pl: null })])
})
