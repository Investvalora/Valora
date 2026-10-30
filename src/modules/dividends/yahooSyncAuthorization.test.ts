import { afterEach, expect, it, vi } from 'vitest'
import { yahooCaller } from '../../../supabase/functions/_shared/yahooAuthorization'

// Runtime das Edge Functions simulado neste teste, sem dependência Deno no app.
declare global {
  const Deno: {
    env: { get(key: string): string | undefined }
    serve(handler: (request: Request) => Response | Promise<Response>): void
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it('nega ausência, formato inválido e configuração vazia sem consultar dados', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  for (const authorization of ['', 'Basic test', 'Bearer ']) {
    expect(await yahooCaller(new Request('https://test', { headers: { authorization } }), 'https://auth', 'service')).toEqual({ kind: 'denied', status: 401 })
  }
  expect(await yahooCaller(new Request('https://test'), 'https://auth', '')).toEqual({ kind: 'denied', status: 503 })
  expect(fetchMock).not.toHaveBeenCalled()
})
it('não confia em um token apenas porque começa como JWT', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
  vi.stubGlobal('fetch', fetchMock)
  expect(await yahooCaller(new Request('https://test', { headers: { authorization: 'Bearer ey-falso' } }), 'https://auth', 'service')).toEqual({ kind: 'denied', status: 401 })
  expect(fetchMock.mock.calls[0][0]).toBe('https://auth/auth/v1/user')
})
it('aceita o job com chave exata, rejeita falha do Auth e ignora claims de admin editáveis', async () => {
  const request = (token: string) => new Request('https://test', { headers: { authorization: `Bearer ${token}` } })
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner', user_metadata: { role: 'admin' } })))
  vi.stubGlobal('fetch', fetchMock)
  expect(await yahooCaller(request('service'), 'https://auth', 'service')).toEqual({ kind: 'service' })
  expect(fetchMock).not.toHaveBeenCalled()
  expect(await yahooCaller(request('expired'), 'https://auth', 'service')).toEqual({ kind: 'denied', status: 503 })
  expect(await yahooCaller(request('session'), 'https://auth', 'service')).toEqual({ kind: 'user', userId: 'owner' })
})

async function handler(slug: string, responseUser: boolean, owned: string[] = []) {
  let invoke!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://auth' : 'service' }, serve: (callback: typeof invoke) => { invoke = callback } })
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }), { status: responseUser ? 200 : 401 })
    if (url.includes('/positions?')) { expect(url).toContain('user_id=eq.owner'); return new Response(JSON.stringify(owned.map(ticker => ({ ticker })))) }
    if (url.includes('/assets?')) return new Response('[]')
    throw new Error('Unexpected privileged operation')
  })
  vi.stubGlobal('fetch', fetchMock)
  if (slug === 'dividends') await import('../../../supabase/functions/sync-dividends-yahoo/index.ts')
  else await import('../../../supabase/functions/sync-yahoo-fundamentals/index.ts')
  return { fetchMock, invoke: (token: string, body = {}) => invoke(new Request('https://test', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })) }
}
it.each(['dividends', 'fundamentals'])('bloqueia token falso antes do catálogo ou gravação: %s', async (slug) => {
  const test = await handler(slug, false)
  expect((await test.invoke('ey-falso')).status).toBe(401)
  expect(test.fetchMock).toHaveBeenCalledTimes(1)
})
it('fundamentos rejeita usuário comum mesmo com sessão válida', async () => {
  const test = await handler('fundamentals', true)
  expect((await test.invoke('session')).status).toBe(403)
  expect(test.fetchMock).toHaveBeenCalledTimes(1)
})
it('serviço de fundamentos limita a consulta ao ticker pedido e rejeita lista vazia', async () => {
  const test = await handler('fundamentals', false)
  expect((await test.invoke('service', { tickers: ['RADL3'] })).status).toBe(200)
  expect(test.fetchMock.mock.calls[0][0]).toContain('ticker=in.(RADL3)')
  const calls = test.fetchMock.mock.calls.length
  expect((await test.invoke('service', { tickers: [] })).status).toBe(400)
  expect(test.fetchMock.mock.calls).toHaveLength(calls)
})
it('sincronização manual nega ticker fora da conta e não processa catálogo global', async () => {
  const test = await handler('dividends', true, ['MXRF11'])
  expect((await test.invoke('session', { tickers: ['PETR4'] })).status).toBe(403)
  expect(test.fetchMock).toHaveBeenCalledTimes(2)
})
it('botão sem tickers consulta apenas os ativos da conta', async () => {
  const test = await handler('dividends', true, ['MXRF11'])
  expect((await test.invoke('session')).status).toBe(200)
  expect(test.fetchMock.mock.calls[2][0]).toContain('assets?ticker=in.(MXRF11)')
})
it.each(['dividends', 'fundamentals'])('job autenticado continua alcançando catálogo completo: %s', async (slug) => {
  const test = await handler(slug, false)
  expect((await test.invoke('service')).status).toBe(200)
  expect(test.fetchMock).toHaveBeenCalledTimes(1)
  expect(test.fetchMock.mock.calls[0][0]).toContain('/assets?active=eq.true')
})
