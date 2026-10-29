import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it('recálculo usa o saldo pós-recebimento mais recente, preserva principal e exige sessão', async () => {
  let handler: ((request: Request) => Promise<Response>) | undefined
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://test.supabase.co' : 'test-only-key' }, serve: (callback: typeof handler) => { handler = callback } })
  const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'PATCH') return new Response(null, { status: 204 })
    return new Response(JSON.stringify([{ id: 'p', user_id: 'u', type: 'cdb_pre', indexer: 'pre', rate: 0, principal: 1000, application_date: '2026-08-01', events: [
      { event_date: '2026-09-01', balance_after: 800, seq: 1 },
      { event_date: '2026-10-01', balance_after: 450, seq: 3 },
      { event_date: '2026-10-01', balance_after: 400, seq: 4 },
    ] }]), { headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  const path = '../../../../supabase/functions/calc-fixed-income/index.ts'
  await import(path)
  expect(handler).toBeDefined()
  expect((await handler!(new Request('https://test/', { method: 'POST' }))).status).toBe(401)
  const token = `x.${btoa(JSON.stringify({ sub: 'u' }))}.x`
  const response = await handler!(new Request('https://test/', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }))
  expect(response.status).toBe(200)
  const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH')
  expect(JSON.parse(String(patch?.[1]?.body))).toEqual(expect.objectContaining({ current_value: 400 }))
  expect(JSON.parse(String(patch?.[1]?.body))).not.toHaveProperty('principal')
  expect(fetchMock.mock.calls.some(([url]) => url.includes('user_id=eq.u'))).toBe(true)

  fetchMock.mockClear()
  const scheduled = await handler!(new Request('https://test/', { method: 'POST', headers: { Authorization: 'Bearer test-only-key' } }))
  expect(scheduled.status).toBe(200)
  const scheduledQuery = fetchMock.mock.calls.find(([url]) => url.includes('fixed_income_positions') && !url.includes('?id='))
  expect(scheduledQuery?.[0]).not.toContain('user_id=eq.')
  expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true)
})
