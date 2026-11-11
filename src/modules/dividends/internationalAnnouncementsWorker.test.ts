import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ source: vi.fn() }))
vi.mock('../../../supabase/functions/sync-international-announcements/source.ts', () => ({ nasdaqSource: mocks.source }))
let handler: (request: Request) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(async () => {
  vi.resetModules(); mocks.source.mockReset()
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://internal.invalid' : 'internal-test-key' }, serve: (h: typeof handler) => { handler = h } })
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/claim_international_announcements')) return Response.json([{ ticker: 'AAPL' }])
    if (url.includes('/store_international_announcements')) return Response.json({ saved: 1, conflicts: 0 })
    if (init?.method === 'PATCH') return new Response(null, { status: 204 })
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)
  const path = '../../../supabase/functions/sync-international-announcements/index.ts'
  await import(path)
})
afterEach(() => { vi.unstubAllGlobals() })
const invoke = () => handler(new Request('https://internal.invalid', { method: 'POST', headers: { Authorization: 'Bearer internal-test-key' } }))
it('consulta identidade antes de gravar anúncio futuro e não cria recebimento pessoal', async () => {
  const day = (offset: number) => new Date(Date.now()+offset*86400000).toISOString().slice(0,10)
  const us = (offset: number) => { const [year,month,date] = day(offset).split('-'); return `${month}/${date}/${year}` }
  mocks.source.mockImplementation(async (_ticker: string, resource: string) => resource === 'info'
    ? { status: { rCode: 200 }, data: { symbol: 'AAPL', stockType: 'Common Stock', isNasdaqListed: true, assetClass: 'STOCKS' } }
    : { status: { rCode: 200 }, data: { dividends: { rows: [{ exOrEffDate: us(1), recordDate: us(1), paymentDate: us(4), declarationDate: us(0), type: 'Cash', amount: '$0.27', currency: 'USD' }] } } })
  const response = await invoke()
  expect(await response.json()).toMatchObject({ processed: 1, saved: 1, received_income_created: 0, errors: [] })
  expect(mocks.source.mock.calls.map(call => call[1])).toEqual(['info','dividends'])
  const store = fetchMock.mock.calls.find(([url]) => String(url).includes('store_international_announcements'))
  expect(JSON.parse(String(store?.[1]?.body))).toMatchObject({ p_ticker: 'AAPL', p_events: [{ ex_date: day(1), payment_date: day(4), value_per_share: 0.27 }] })
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('wallet_income'))).toBe(false)
})
it('recusa chamada sem autorização antes de consultar fila ou fonte', async () => {
  expect((await handler(new Request('https://internal.invalid', { method: 'POST' }))).status).toBe(401)
  expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.source).not.toHaveBeenCalled()
})
it('bloqueia ativo incompatível e espaça nova tentativa sem gravar anúncio', async () => {
  mocks.source.mockResolvedValue({ status: { rCode: 200 }, data: { symbol: 'AAPL', stockType: 'Preferred Stock' } })
  const response = await invoke()
  expect(response.status).toBe(503)
  expect(mocks.source).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('store_international'))).toBe(false)
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
  expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ last_error: 'nasdaq_identity_unsupported' })
})
it('registra somente código seguro da falha da fonte', async () => {
  mocks.source.mockRejectedValue(new Error('remote body secret-token-test'))
  expect((await invoke()).status).toBe(503)
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
  expect(JSON.parse(String(patch?.[1]?.body)).last_error).toBe('nasdaq_source_unavailable')
  expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('secret-token-test')
})
