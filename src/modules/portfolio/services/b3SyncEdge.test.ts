import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
it('usa arquivo diário quando o mensal não foi publicado e informa cobertura parcial', async () => {
  let handler!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://test' : 'internal' }, serve: (value: typeof handler) => { handler = value } })
  const line = Array(245).fill(' ')
  const put = (at: number, value: string) => { for (let i = 0; i < value.length; i++) line[at + i] = value[i] }
  put(0,'01'); put(2,'20261106'); put(12,'RADL3'); put(24,'010')
  for (const at of [56,69,82,108]) put(at,'0000000001483')
  put(210,'0000001'); put(230,'BRRADLACNOR0')
  const payload = new TextEncoder().encode(line.join('')+'\n')
  const zip = new Uint8Array(30+payload.length), view = new DataView(zip.buffer)
  view.setUint32(0,0x04034b50,true); view.setUint32(18,payload.length,true); zip.set(payload,30)
  const written: string[] = []
  vi.stubGlobal('fetch',vi.fn(async(url: string, init?: RequestInit) => {
    if(url.includes('/assets?')) return Response.json([{ticker:'RADL3',provider_symbol:'RADL3'}])
    if(url.includes('COTAHIST_M')) return new Response(null,{status:404})
    if(url.includes('COTAHIST_D')) return new Response(zip)
    if(init?.method==='POST') {written.push(url);return new Response(null,{status:204})}
    throw new Error('Unexpected request')
  }))
  const path = '../../../../supabase/functions/sync-b3-prices/index.ts'; await import(path)
  const response = await handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer internal'}}))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({linhas:1,cobertura_mensal_completa:false,avisos:[expect.stringContaining('monthly_unavailable_daily_only:')]})
  expect(written.some(url=>url.includes('asset_market_identifiers'))).toBe(true)
  expect(written.some(url=>url.includes('price_history'))).toBe(true)
})
it('não informa sucesso quando o arquivo oficial não ficou disponível', async () => {
  let handler!: (request: Request) => Promise<Response>
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://test' : 'internal' }, serve: (value: typeof handler) => { handler = value } })
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/assets')
    ? Response.json([{ ticker: 'RADL3', provider_symbol: 'RADL3' }])
    : new Response(null, { status: 503 })))
  const path = '../../../../supabase/functions/sync-b3-prices/index.ts'
  await import(path)
  const response = await handler(new Request('https://test', { method: 'POST', headers: { Authorization: 'Bearer internal' } }))
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ meses_ok: 0, meses_falha: 1, linhas: 0 })
})
