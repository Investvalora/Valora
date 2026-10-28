/** Credencial interna exata do runtime ou a credencial exata do agendador
 * confirmada pelo Vault. Nunca autoriza por prefixo ou claim de JWT. */
export async function authorizePush(
  authorization: string | null, runtimeKey: string,
  checkVaultDigest: (digest: string) => Promise<boolean>,
): Promise<boolean> {
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1]
  if (!runtimeKey || !token) return false
  if (token === runtimeKey) return true
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const digest = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    return await checkVaultDigest(digest)
  } catch { return false }
}
