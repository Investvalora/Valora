import { expect, it, vi } from 'vitest'
// @ts-expect-error Standalone Node runner has no application-facing declarations.
import { drainPublicAnnouncementQueues } from '../../../scripts/drain-public-announcement-queues.mjs'

const work = () => ({ results: [{ ticker: 'fixture' }], failed: 0 })
const empty = () => ({ results: [], failed: 0 })

it('catches up at most three batches per public queue, alternating for fairness', async () => {
  const order: string[] = []
  const primary = vi.fn(async () => { order.push('primary'); return work() })
  const sec = vi.fn(async () => { order.push('sec'); return work() })
  const result = await drainPublicAnnouncementQueues({ primary, sec })
  expect(order).toEqual(['primary', 'sec', 'primary', 'sec', 'primary', 'sec'])
  expect(result).toMatchObject({ failed: 0, deadline_reached: false })
  expect(result.batches).toHaveLength(6)
})

it('stops claiming empty queues while draining the other queue', async () => {
  const primary = vi.fn(async () => empty())
  const sec = vi.fn(async () => work())
  await drainPublicAnnouncementQueues({ primary, sec })
  expect(primary).toHaveBeenCalledTimes(1)
  expect(sec).toHaveBeenCalledTimes(3)
})

it('does not retry a failing source in the same run or hide its failure', async () => {
  const primary = vi.fn(async () => ({ ...work(), failed: 1 }))
  const sec = vi.fn(async () => empty())
  expect(await drainPublicAnnouncementQueues({ primary, sec })).toMatchObject({ failed: 1 })
  expect(primary).toHaveBeenCalledTimes(1)
})

it('isolates collector exceptions and never logs upstream bodies or credentials', async () => {
  const primary = vi.fn(async () => { throw new Error('secret-upstream-body') })
  const sec = vi.fn(async () => work())
  const report = vi.fn()
  const result = await drainPublicAnnouncementQueues({ primary, sec, report })
  expect(result.failed).toBe(1)
  expect(sec).toHaveBeenCalledTimes(3)
  expect(JSON.stringify(report.mock.calls)).not.toContain('secret-upstream-body')
})

it('lets in-flight work finish but starts no more batches after the deadline', async () => {
  let time = 0
  const primary = vi.fn(async () => { time += 120001; return work() })
  const sec = vi.fn(async () => work())
  const result = await drainPublicAnnouncementQueues({ primary, sec, now: () => time })
  expect(result).toMatchObject({ failed: 0, deadline_reached: true })
  expect(primary).toHaveBeenCalledTimes(1)
  expect(sec).not.toHaveBeenCalled()
})

it('fails closed on malformed collector results without a tight retry loop', async () => {
  const primary = vi.fn(async () => ({ results: null, failed: 0 }))
  const sec = vi.fn(async () => empty())
  expect(await drainPublicAnnouncementQueues({ primary, sec })).toMatchObject({ failed: 1 })
  expect(primary).toHaveBeenCalledTimes(1)
})
