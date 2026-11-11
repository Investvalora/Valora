import { get } from 'node:https'
import { Buffer } from 'node:buffer'

/** Nasdaq's endpoint failed with native Deno fetch in local QA. Node-compatible
 * HTTPS works without proxies, forged identity or relaxing certificate checks. */
export function nasdaqSource(ticker: string, resource: 'info' | 'dividends'): Promise<unknown> {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error('nasdaq_identity_unsupported')
  return new Promise((resolve, reject) => {
    const req = get(`https://api.nasdaq.com/api/quote/${encodeURIComponent(ticker)}/${resource}?assetclass=stocks`, { headers: { Accept: 'application/json' } }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`nasdaq_http_${response.statusCode ?? 500}`)); return }
      const chunks: Buffer[] = []; let size = 0
      response.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 2*1024*1024) { req.destroy(new Error('nasdaq_response_too_large')); return }
        chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch { reject(new Error('nasdaq_schema_changed')) }
      })
    })
    const timer = setTimeout(() => req.destroy(new Error('nasdaq_source_timeout')), 12000)
    req.on('error', reject)
    req.on('close', () => clearTimeout(timer))
  })
}
