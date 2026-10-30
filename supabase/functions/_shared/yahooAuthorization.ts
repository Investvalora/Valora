export type YahooCaller = { kind: 'service' } | { kind: 'user'; userId: string } | { kind: 'denied'; status: 401 | 503 }

/** Valida a sessão no Auth; aparência ou claims não verificados nunca autorizam. */
export async function yahooCaller(request: Request, url: string, serviceKey: string): Promise<YahooCaller> {
  if (!url || !serviceKey) return { kind: 'denied', status: 503 }
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) return { kind: 'denied', status: 401 }
  if (token === serviceKey) return { kind: 'service' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }, signal: controller.signal })
    if (!response.ok) {
      if (response.status >= 500) return { kind: 'denied', status: 503 }
      // Scheduled jobs may use the legacy service credential kept in Vault.
      // Verify its digest in the database; decoded JWT claims are never trusted.
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), byte => byte.toString(16).padStart(2, '0')).join('')
      const job = await fetch(`${url}/rest/v1/rpc/authorize_market_job`, {
        method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_digest: digest }), signal: controller.signal,
      })
      return job.ok && await job.json() === true ? { kind: 'service' } : { kind: 'denied', status: 401 }
    }
    const user = await response.json()
    return typeof user?.id === 'string' && user.id && !user.is_anonymous
      ? { kind: 'user', userId: user.id }
      : { kind: 'denied', status: 401 }
  } catch { return { kind: 'denied', status: 503 } }
  finally { clearTimeout(timer) }
}
