import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

async function setup(options: { authenticated?: boolean; failUpdate?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: () => 'test-only' }, serve: (callback: typeof handler) => { handler = callback } })
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }), { status: options.authenticated === false ? 401 : 200 })
    if (url.includes('price_history?')) return new Response(JSON.stringify([{ close: '25.00', date: '2026-10-26' }]))
    expect(url).toContain('user_id=eq.owner')
    if (init?.method === 'PATCH') {
      expect(url).toContain('status=eq.lido')
      expect(url).toContain('last_quote_date=is.null')
      expect(JSON.parse(String(init.body))).toEqual({ status: 'novo', last_quote_date: '2026-10-26' })
      return new Response(JSON.stringify([{ id: 'below' }]), { status: options.failUpdate ? 500 : 200 })
    }
    return new Response(JSON.stringify([
      { id: 'below', ticker: 'PETR4', target_price: 25, condition: 'below', status: 'lido' },
      { id: 'above', ticker: 'PETR4', target_price: 30, condition: 'above', status: 'lido' },
      { id: 'already-new', ticker: 'PETR4', target_price: 25, condition: 'above', status: 'novo' },
      { id: 'already-read', ticker: 'PETR4', target_price: 25, condition: 'below', status: 'lido', last_quote_date: '2026-10-26' },
    ]))
  })
  vi.stubGlobal('fetch', fetchMock)
  const path = '../../../supabase/functions/check-price-targets/index.ts'
  await import(path)
  return { invoke: () => handler(new Request('https://test/', { method: 'POST', headers: { Authorization: 'Bearer test' } })), fetchMock }
}

it('dispara no limite inclusivo, lê NUMERIC textual e não duplica alertas já novos', async () => {
  const { invoke, fetchMock } = await setup()
  const response = await invoke()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ triggered: 1 })
  const updates = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
  expect(updates).toHaveLength(1)
  expect(updates[0][0]).toContain('id=eq.below')
})

it('nega chamada sem usuário válido antes de consultar dados privados', async () => {
  const { invoke, fetchMock } = await setup({ authenticated: false })
  expect((await invoke()).status).toBe(401)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('retorna erro quando a gravação falha, sem indicar sucesso silencioso', async () => {
  const { invoke } = await setup({ failUpdate: true })
  expect((await invoke()).status).toBe(500)
})
