/** Catch up after delayed schedules, without repeating paid-provider requests.
 * Each collector still claims its original bounded batch and honors DB leases.
 * The deadline is checked between batches; in-flight collectors finish normally.
 */
export async function drainPublicAnnouncementQueues({ primary, sec, now = Date.now, report = () => {} }) {
  const started = now()
  const queues = [
    { name: 'primary', collect: primary, active: true },
    { name: 'sec', collect: sec, active: true },
  ]
  const batches = []
  for (let round = 0; round < 3; round++) {
    for (const queue of queues) {
      if (!queue.active || now() - started >= 120000) continue
      let result
      try {
        result = await queue.collect()
        if (!Array.isArray(result.results) || !Number.isInteger(result.failed) || result.failed < 0) throw new Error('invalid_batch_result')
      } catch {
        result = { results: [], failed: 1, error: 'public_collector_failed' }
      }
      const batch = { queue: queue.name, round: round + 1, ...result }
      batches.push(batch)
      report(batch)
      // Do not hammer a failing source or keep claiming an empty queue.
      if (result.failed || result.results.length === 0) queue.active = false
    }
    if (queues.every(queue => !queue.active)) break
  }
  return { batches, failed: batches.reduce((sum, batch) => sum + batch.failed, 0), deadline_reached: now() - started >= 120000 }
}
