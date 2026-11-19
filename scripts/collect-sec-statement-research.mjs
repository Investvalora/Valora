import { secIdentity } from '../supabase/functions/sync-international-announcements/sec.ts'
import { publicText } from './sec-dividend-announcements.mjs'
import { secStatementResearch } from '../src/shared/indicators/secStatementResearch.ts'

/** Read-only research output. No credentials, queue writes or fundamentals upsert. */
export async function collectSecStatementResearch(tickers, request = fetch) {
  if (!Array.isArray(tickers) || !tickers.length || tickers.length > 10 || tickers.some(t => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(t))) throw new Error('sec_statement_invalid_batch')
  const registry = JSON.parse(await publicText('https://www.sec.gov/files/company_tickers_exchange.json', request))
  const results = []
  for (const ticker of [...new Set(tickers)]) {
    try {
      const identity = secIdentity(registry, ticker)
      const submissions = JSON.parse(await publicText(`https://data.sec.gov/submissions/CIK${identity.cik}.json`, request))
      await new Promise(resolve => setTimeout(resolve, 250))
      const response = await request(`https://data.sec.gov/api/xbrl/companyfacts/CIK${identity.cik}.json`, {
        headers: { 'User-Agent': 'Valora public data collector (https://investvalora.vercel.app)', Accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error(`sec_statement_http_${response.status}`)
      const reader = response.body?.getReader()
      if (!reader) throw new Error('sec_statement_empty_body')
      const chunks = []; let size = 0
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.length
          if (size > 32 * 1024 * 1024) throw new Error('sec_statement_response_too_large')
          chunks.push(value)
        }
      } finally { await reader.cancel().catch(() => {}) }
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      results.push(secStatementResearch(submissions, JSON.parse(new TextDecoder().decode(bytes)), ticker, identity.cik, new Date().toISOString().slice(0, 10)))
    } catch (e) {
      const error = e instanceof Error && /^sec_[a-z0-9_]{1,70}$/.test(e.message) ? e.message : 'sec_statement_source_unavailable'
      results.push({ ticker, status: 'unavailable', error })
    }
  }
  return { collectedAt: new Date().toISOString(), mode: 'research_only', results }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/collect-sec-statement-research.mjs')) {
  const result = await collectSecStatementResearch(process.argv.slice(2))
  console.log(JSON.stringify(result, null, 2))
  if (result.results.some(r => r.status === 'unavailable' || r.status === 'partial')) process.exitCode = 1
}
