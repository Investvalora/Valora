import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it('distingue provedor fora do ar de uma resposta válida sem eventos', async () => {
  let handler!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://test' : 'internal' }, serve: (value: typeof handler) => { handler = value } })
  let unavailable = true
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/assets?')) return Response.json([{ ticker: 'JPM', currency: 'USD' }])
    if (url.includes('finance.yahoo.com')) return unavailable ? new Response(null, { status: 503 }) : Response.json({ chart: { result: [{ events: {} }], error: null } })
    throw new Error('Unexpected request')
  }))
  const path = '../../../../supabase/functions/sync-dividends-yahoo/index.ts'
  await import(path)
  const request = () => new Request('https://test', { method: 'POST', headers: { Authorization: 'Bearer internal' }, body: '{}' })
  const failed = await handler(request())
  expect(failed.status).toBe(503)
  expect(await failed.json()).toMatchObject({ synced: 0, failed: 1, errors: [{ ticker: 'JPM', reason: 'provider_or_storage_unavailable' }] })
  unavailable = false
  const empty = await handler(request())
  expect(empty.status).toBe(200)
  expect(await empty.json()).toMatchObject({ synced: 1, inserted: 0, failed: 0 })
})
