/** Origem pública explícita em produção; a origem do navegador atende dev/preview. */
export function authRedirect(path: '/login' | '/reset-password'): string {
  const configured = import.meta.env.VITE_APP_URL?.trim()
  const origin = configured ? new URL(configured).origin : window.location.origin
  const url = new URL(path, origin)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL pública inválida')
  if (import.meta.env.PROD && configured && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('A URL pública de produção não pode apontar para localhost')
  }
  return url.href
}
