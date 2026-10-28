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
    if (!response.ok) return { kind: 'denied', status: response.status >= 500 ? 503 : 401 }
    const user = await response.json()
    return typeof user?.id === 'string' && user.id && !user.is_anonymous
      ? { kind: 'user', userId: user.id }
      : { kind: 'denied', status: 401 }
  } catch { return { kind: 'denied', status: 503 } }
  finally { clearTimeout(timer) }
}
