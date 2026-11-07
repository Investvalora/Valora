/** Only exact internal credentials authorize global jobs; JWT claims are not trusted. */
export async function authorizeServiceJob(request: Request, url: string, serviceKey: string): Promise<boolean> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!url || !serviceKey || !token) return false
  if (token === serviceKey) return true
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const digest = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    const response = await fetch(`${url}/rest/v1/rpc/authorize_market_job`, {
      method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_digest: digest }),
    })
    return response.ok && await response.json() === true
  } catch { return false }
}
