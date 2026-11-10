/** Read only error flags, never retain tokens or provider error descriptions. */
export function isRejectedRecoveryReturn(pathname: string, search: string, hash: string): boolean {
  if (pathname !== '/reset-password') return false
  return [new URLSearchParams(search), new URLSearchParams(hash.replace(/^#/, ''))]
    .some(params => Boolean(params.get('error') || params.get('error_code')))
}

// Evaluated before createClient can process or clean the callback URL.
export const rejectedRecoveryOnStartup = typeof window !== 'undefined' && isRejectedRecoveryReturn(
  window.location.pathname, window.location.search, window.location.hash,
)
