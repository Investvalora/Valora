// Browser UX safeguard, not a server rate limiter. No email or password is stored.
const KEY = 'valora:login-backoff:v1'
const RESET_MS = 15 * 60_000
let memory = { failures: 0, lastFailure: 0, blockedUntil: 0 }
let inFlight = false
const listeners = new Set<() => void>()

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const value = JSON.parse(raw)
      if (Number.isInteger(value.failures) && value.failures >= 0 && value.failures <= 30 &&
          Number.isFinite(value.lastFailure) && Number.isFinite(value.blockedUntil) &&
          value.blockedUntil <= Date.now() + 60_000) memory = value
    }
  } catch { /* Storage disabled: retain in-memory protection. */ }
  return Date.now() - memory.lastFailure > RESET_MS ? { failures: 0, lastFailure: 0, blockedUntil: 0 } : memory
}

function save(value: typeof memory) {
  memory = value
  try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* Private browsing. */ }
  listeners.forEach(listener => listener())
}

export class LoginCooldownError extends Error {
  constructor(public readonly seconds: number) { super(`Aguarde ${seconds}s para tentar entrar novamente.`) }
}

export const loginThrottle = {
  remaining: () => Math.max(0, Math.ceil((read().blockedUntil - Date.now()) / 1000)),
  begin() {
    const seconds = loginThrottle.remaining()
    if (seconds) throw new LoginCooldownError(seconds)
    if (inFlight) throw new Error('Já existe uma tentativa de login em andamento.')
    inFlight = true
  },
  finish() { inFlight = false },
  success() { save({ failures: 0, lastFailure: 0, blockedUntil: 0 }) },
  failure(error: unknown) {
    const detail = error as { status?: number; code?: string; message?: string }
    const rateLimited = detail?.status === 429 || detail?.code === 'over_request_rate_limit'
    const credentialsRejected = detail?.code === 'invalid_credentials' ||
      /invalid (login )?credentials/i.test(detail?.message ?? '')
    if (!rateLimited && !credentialsRejected) return
    const failures = Math.min(30, read().failures + 1)
    const delay = rateLimited ? 60_000 : Math.min(60_000, 2000 * 2 ** Math.min(failures - 1, 5))
    save({ failures, lastFailure: Date.now(), blockedUntil: Date.now() + delay })
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    const timer = setInterval(listener, 1000)
    window.addEventListener('storage', listener)
    return () => { clearInterval(timer); listeners.delete(listener); window.removeEventListener('storage', listener) }
  },
}
