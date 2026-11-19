import { expect, it, vi } from 'vitest'
// @ts-expect-error Standalone Node runner.
import { syncSecStatementCatalog } from '../../../scripts/sync-sec-statement-catalog.mjs'
it('does not collect when there is no eligible task', async () => {
  const request = vi.fn(async () => Response.json({ tasks: [] }))
  const collect = vi.fn()
  expect(await syncSecStatementCatalog('test-identity', request, collect)).toMatchObject({ processed: 0, failed: 0 })
  expect(collect).not.toHaveBeenCalled()
})
it('stores using the claimed lease and distinguishes unsupported issuers from transport failures', async () => {
  const bodies: Record<string, unknown>[] = []
  const request = vi.fn(async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); bodies.push(body)
    return Response.json(body.mode === 'claim' ? { tasks: [{ ticker: 'BB', claim_token: 'lease-1' }, { ticker: 'KO', claim_token: 'lease-2' }] } : { saved: true })
  })
  const collect = vi.fn(async () => ({ results: [{ ticker: 'BB', status: 'unavailable', error: 'sec_statement_annual_unavailable' }, { ticker: 'KO', status: 'unavailable', error: 'sec_statement_http_503' }] }))
  expect(await syncSecStatementCatalog('test-identity', request, collect)).toMatchObject({ processed: 2, failed: 1 })
  expect(bodies[1]).toMatchObject({ mode: 'finish', ticker: 'BB', claim_token: 'lease-1', snapshot: null })
})
it('rejects an overlarge queue response and a failed acknowledgement', async () => {
  await expect(syncSecStatementCatalog('test-identity', async () => Response.json({ tasks: [{}, {}, {}] }))).rejects.toThrow('invalid_tasks')
  let count = 0
  const request = async () => Response.json(count++ === 0 ? { tasks: [{ ticker: 'AAPL', claim_token: 'lease' }] } : { saved: false })
  const collect = async () => ({ results: [{ ticker: 'AAPL', status: 'partial' }] })
  await expect(syncSecStatementCatalog('test-identity', request, collect)).rejects.toThrow('not_saved')
})
