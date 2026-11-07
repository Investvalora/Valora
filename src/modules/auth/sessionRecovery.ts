/** Only explicit Auth codes invalidate a session; network/5xx errors never do. */
export function isRevokedSession(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(String(error.code))
}
