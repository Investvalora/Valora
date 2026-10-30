import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

async function setup(owned: boolean, valid = true, chartSuccess = false) {
  let handler!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://db.test' : 'service' }, serve: (value: typeof handler) => { handler = value } })
  const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }), { status: valid ? 200 : 401 })
    if (input.includes('/positions?')) { expect(input).toContain('user_id=eq.owner'); return new Response(owned ? '[{"ticker":"RADL3"}]' : '[]') }
    if (input.includes('/assets?')) return new Response('[{"ticker":"RADL3","type":"stock_br","currency":"BRL"}]')
    if (input.includes('/fundamentals?')) return new Response('[]')
    if (input.includes('/functions/v1/sync-yahoo-fundamentals')) { expect(JSON.parse(String(init?.body))).toEqual({ tickers: ['RADL3'] }); return new Response('{"gravados":0}') }
    if (input.includes('/dividends?')) {
      if (init?.method === 'POST') throw new Error('Must not duplicate existing JCP')
      return new Response('[{"ex_date":"2026-10-29"}]')
    }
    if (input.includes('/price_history?')) {
      expect(init?.headers).toHaveProperty('Prefer', 'resolution=ignore-duplicates,return=minimal')
      return new Response(null, { status: 201 })
    }
    if (input.includes('finance.yahoo.com')) return chartSuccess
      ? new Response(JSON.stringify({ chart: { result: [{ timestamp: [Date.parse('2026-10-29') / 1000], indicators: { quote: [{ close: [12] }] }, events: { dividends: { one: { date: Date.parse('2026-10-29') / 1000, amount: 0.2 } } } }] } }))
      : new Response('{}', { status: 429 })
    throw new Error('Unexpected write')
  })
  vi.stubGlobal('fetch', fetcher)
  const module = await import('../../../../supabase/functions/sync-asset-data/index.ts')
  return { module, fetcher, invoke: () => handler(new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer session' }, body: '{"ticker":"RADL3"}' })) }
}

it('nega sessão inválida e ticker de outra conta antes de acessar fontes ou gravar', async () => {
  let test = await setup(true, false)
  expect((await test.invoke()).status).toBe(401)
  expect(test.fetcher).toHaveBeenCalledTimes(1)
  vi.resetModules()
  test = await setup(false)
  expect((await test.invoke()).status).toBe(403)
  expect(test.fetcher).toHaveBeenCalledTimes(2)
})

it('retorna indisponibilidade parcial sem gravar preços inventados quando a fonte limita chamadas', async () => {
  const test = await setup(true)
  const response = await test.invoke()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ ticker: 'RADL3', prices: 'unavailable', dividends: 'unavailable', fundamentals: 'unavailable' })
})

it('mapeia moedas e valida preços sem usar ajuste nem inventar pagamento', async () => {
  const { module } = await setup(true)
  expect(module.yahooSymbol({ ticker: 'BTC-BRL', type: 'crypto', currency: 'BRL' })).toBe('BTC-BRL')
  expect(module.yahooSymbol({ ticker: 'BTC', type: 'crypto', currency: 'USD' })).toBe('BTC-USD')
  const rows = module.chartRows({ ticker: 'RADL3', type: 'stock_br', currency: 'BRL' }, {
    timestamp: [Date.parse('2026-10-29') / 1000, Date.parse('2026-10-30') / 1000],
    indicators: { quote: [{ close: [12, null] }] }, events: { dividends: { one: { date: Date.parse('2026-10-29') / 1000, amount: 0.2 } } },
  }, '2026-10-30')
  expect(rows.prices).toEqual([{ ticker: 'RADL3', date: '2026-10-29', close: 12, source: 'yahoo' }])
  expect(rows.dividends[0]).not.toHaveProperty('payment_date')
})

it('preenche histórico sem sobrescrever preços e não duplica eventos de outra fonte na mesma data', async () => {
  const test = await setup(true, true, true)
  const response = await test.invoke()
  expect(await response.json()).toMatchObject({ prices: 'updated', dividends: 'updated' })
  expect(test.fetcher.mock.calls.filter(([url, init]) => url.includes('/dividends?') && init?.method === 'POST')).toHaveLength(0)
})
