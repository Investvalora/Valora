import { expect, it, vi } from 'vitest'
import { syncQuotes } from '../../../../supabase/functions/sync-brapi-prices/sync'
const now = new Date('2026-11-04T18:00:00Z')
const asset = { ticker: 'VGHF11', currency: 'BRL' }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
const yahoo = (extra = {}) => reply({ chart: { result: [{ meta: { symbol: 'VGHF11.SA', currency: 'BRL', regularMarketPrice: 4.06, regularMarketTime: now.getTime()/1000, ...extra } }] } })
const brapi = (extra = {}) => reply({ results: [{ symbol: 'VGHF11', regularMarketPrice: 4.1, regularMarketTime: now.toISOString(), ...extra }] })
function deps(fetcher: typeof fetch) { return { keys: [{ id: 'key-a', token: 'test-a' }, { id: 'key-b', token: 'test-b' }], now, fetch: fetcher, block: vi.fn().mockResolvedValue(undefined), save: vi.fn().mockResolvedValue(true) } }
it('Yahoo is primary and spends no Brapi quota when valid', async () => {
  const d = deps(vi.fn().mockResolvedValue(yahoo()))
  expect(await syncQuotes([asset],d)).toMatchObject({ yahooRequests: 1, brapiRequests: 0, saved: 1 })
  expect(d.save).toHaveBeenCalledWith(expect.objectContaining({ close: 4.06, source: 'yahoo', date: '2026-11-04', market_time: now.toISOString() }))
})
it('rotates to the next key after quota failure, persisting only that key cooldown', async () => {
  const f = vi.fn().mockResolvedValueOnce(reply({},503))
    .mockResolvedValueOnce(reply({ code: 'MONTHLY_LIMIT_EXCEEDED', details: { usage: { resetsAt: '2026-11-08T00:36:38Z' } } },429))
    .mockResolvedValueOnce(brapi())
  const d = deps(f)
  expect(await syncQuotes([asset],d)).toMatchObject({ brapiRequests: 2, saved: 1, blockedKeys: 1 })
  expect(d.block).toHaveBeenCalledWith('key-a','2026-11-08T00:36:38.000Z','monthly_limit')
  expect(f.mock.calls[2][1].headers.Authorization).toBe('Bearer test-b')
  expect(f.mock.calls.every(c=>!String(c[0]).includes('token='))).toBe(true)
})
it('honors persistent cooldown and tries only available keys', async () => {
  const f = vi.fn().mockResolvedValueOnce(reply({},503)).mockResolvedValueOnce(brapi())
  const d = deps(f); d.keys[0] = { ...d.keys[0], blockedUntil: '2026-11-08T00:00:00Z' } as typeof d.keys[0]
  expect(await syncQuotes([asset],d)).toMatchObject({ brapiRequests: 1,saved:1 })
  expect(f.mock.calls[1][1].headers.Authorization).toBe('Bearer test-b')
})
it('rejects an old primary when a newer Brapi quote exists', async () => {
  const d = deps(vi.fn().mockResolvedValueOnce(yahoo({regularMarketTime:now.getTime()/1000-172800})).mockResolvedValueOnce(brapi()))
  await syncQuotes([asset],d)
  expect(d.save).toHaveBeenCalledWith(expect.objectContaining({source:'brapi',close:4.1}))
})
it('preserves the real older session date when both sources fail to improve it', async () => {
  const d = deps(vi.fn().mockResolvedValueOnce(yahoo({regularMarketTime:now.getTime()/1000-172800})).mockRejectedValue(new Error('offline')))
  await syncQuotes([asset],d)
  expect(d.save).toHaveBeenCalledWith(expect.objectContaining({date:'2026-11-02',source:'yahoo'}))
})
it.each([{currency:'USD'},{symbol:'OTHER.SA'},{regularMarketPrice:-1},{regularMarketTime:0},{regularMarketTime:now.getTime()/1000+86400}])('rejects invalid Yahoo %j without keys', async extra=>{
  const d = {...deps(vi.fn().mockResolvedValue(yahoo(extra))),keys:[]}
  expect(await syncQuotes([asset],d)).toMatchObject({failed:1,saved:0})
  expect(d.save).not.toHaveBeenCalled()
})
it('preserves storage and reports safe diagnostics when every provider fails', async()=>{
  const d=deps(vi.fn().mockRejectedValue(new Error('secret query string')))
  const result=await syncQuotes([asset],d)
  expect(result).toMatchObject({failed:1,saved:0})
  expect(JSON.stringify(result)).not.toContain('secret')
})
it('does not claim an update when storage preserves a later or official quote',async()=>{
  const d=deps(vi.fn().mockResolvedValue(yahoo())); d.save.mockResolvedValue(false)
  expect(await syncQuotes([asset],d)).toMatchObject({preserved:1,saved:0,failed:0})
})
it('isolates storage failure per asset',async()=>{
  const d=deps(vi.fn().mockResolvedValue(yahoo())); d.save.mockRejectedValue(new Error('private'))
  expect(await syncQuotes([asset],d)).toMatchObject({failed:1,errors:[{ticker:'VGHF11',reason:'storage_unavailable'}]})
})
it('server diagnostic exercises distinct fallback keys without Yahoo',async()=>{
  const f=vi.fn().mockImplementation(async (_url, options)=>brapi({symbol:String(options.headers.Authorization).endsWith('test-a')?'VGHF11':'MXRF11'}))
  const d={...deps(f),brapiOnly:true}
  d.save.mockResolvedValue(false)
  expect(await syncQuotes([asset,{ticker:'MXRF11',currency:'BRL'}],d)).toMatchObject({yahooRequests:0,brapiRequests:2,preserved:2,failed:0})
  expect(f.mock.calls.map(c=>c[1].headers.Authorization)).toEqual(['Bearer test-a','Bearer test-b'])
})
