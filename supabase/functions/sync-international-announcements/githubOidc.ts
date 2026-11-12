import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'npm:jose@6.1.3'
const keys = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'), { timeoutDuration: 5000 })
const repository = 'Investvalora/Valora'
export async function verifyGithubCollectorToken(token: string, audience: string, keySet: JWTVerifyGetKey = keys): Promise<void> {
  if (token.length > 16000) throw new Error('invalid_collector_identity')
  const { payload: p } = await jwtVerify(token, keySet, { algorithms: ['RS256'], issuer: 'https://token.actions.githubusercontent.com', audience, typ: 'JWT', maxTokenAge: 300, clockTolerance: 5, requiredClaims: ['exp','iat','nbf','jti'] })
  if (p.repository !== repository || p.repository_id !== '1228349930' || p.repository_owner_id !== '282645586'
    || p.ref !== 'refs/heads/main' || p.sub !== `repo:${repository}:ref:refs/heads/main`
    || p.workflow_ref !== `${repository}/.github/workflows/international-announcements.yml@refs/heads/main`
    || p.runner_environment !== 'github-hosted' || p.repository_visibility !== 'public'
    || !['schedule','workflow_dispatch'].includes(String(p.event_name)) || !/^\d+$/.test(String(p.run_id))) throw new Error('invalid_collector_identity')
}
export async function authorizeInternationalCollector(request: Request, url: string, serviceKey: string, requestBackend: typeof fetch = fetch): Promise<boolean> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token || !url || !serviceKey) return false
  if (token === serviceKey) return true
  try { await verifyGithubCollectorToken(token, `${url}/functions/v1/sync-international-announcements`); return true }
  catch {
    // Cron uses the legacy job credential in Vault, which can differ from the
    // runtime service key. Authorize its digest server-side, never its JWT claims.
    try {
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('')
      const response=await requestBackend(`${url}/rest/v1/rpc/authorize_market_job`,{
        method:'POST',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({token_digest:digest}),redirect:'error',signal:AbortSignal.timeout(10000),
      })
      return response.ok&&await response.json()===true
    }catch{return false}
  }
}
