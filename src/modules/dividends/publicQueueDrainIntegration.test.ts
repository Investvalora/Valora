import { expect, it, vi } from 'vitest'
// @ts-expect-error Standalone Node runner.
import { drainPublicAnnouncementQueues } from '../../../scripts/drain-public-announcement-queues.mjs'
// @ts-expect-error Standalone Node runner.
import { collectAnnouncements } from '../../../scripts/collect-international-announcements.mjs'
// @ts-expect-error Standalone Node runner.
import { collectSecDividends } from '../../../scripts/sec-dividend-announcements.mjs'

it('drains real collector adapters with unique leases and no paid-provider requests', async () => {
  const endpoint = 'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements'
  const primaryTasks = ['AAPL', 'COST', 'META', 'CR', 'JPM', 'MA', 'PRT'].map(ticker => ({ ticker, claim_token: `primary-${ticker}` }))
  const secTasks = ['AAPL', 'COST', 'META', 'CR'].map(ticker => ({ ticker, claim_token: `sec-${ticker}` }))
  const leases = new Map<string, string>()
  const finished: string[] = []
  const modes: string[] = []
  const request = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(endpoint)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer local-fixture')
    const body = JSON.parse(String(init.body))
    modes.push(body.mode)
    if (body.mode === 'claim' || body.mode === 'claim_sec') {
      const tasks = body.mode === 'claim' ? primaryTasks.splice(0, 2) : secTasks.splice(0, 1)
      for (const task of tasks) leases.set(task.claim_token, task.ticker)
      return Response.json({ tasks })
    }
    expect(['finish_primary', 'finish_sec']).toContain(body.mode)
    expect(leases.get(body.claim_token)).toBe(body.ticker)
    leases.delete(body.claim_token)
    finished.push(body.claim_token)
    return Response.json({ saved: 0, conflicts: 0, error: null })
  })
  const publicSource = vi.fn(async () => [])
  const primarySources = Object.fromEntries(primaryTasks.map(task => [task.ticker, publicSource]))
  const discover = vi.fn(async () => ({ cik: '0000000001', events: [], inspected: 1, truncated: false, unsupported: 0 }))
  const result = await drainPublicAnnouncementQueues({
    primary: () => collectAnnouncements({ endpoint, token: 'local-fixture', request, primarySources }),
    sec: () => collectSecDividends({ endpoint, token: 'local-fixture', request, discover }),
  })
  expect(result.failed).toBe(0)
  expect(finished).toHaveLength(9)
  expect(new Set(finished).size).toBe(9)
  expect(leases.size).toBe(0)
  expect(primaryTasks.map(task => task.ticker)).toEqual(['PRT'])
  expect(secTasks.map(task => task.ticker)).toEqual(['CR'])
  expect(publicSource).toHaveBeenCalledTimes(6)
  expect(discover).toHaveBeenCalledTimes(3)
  expect(modes.filter(mode => mode === 'claim')).toHaveLength(3)
  expect(modes.filter(mode => mode === 'claim_sec')).toHaveLength(3)
  expect(modes).not.toContain('providers')
})
