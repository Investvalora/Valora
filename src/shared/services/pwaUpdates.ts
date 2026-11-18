/** Check for a newer worker on resume, without reloading forms or clearing storage. */
export function watchPwaUpdates(registration: Pick<ServiceWorkerRegistration, 'update'>) {
  const interval = 30 * 60 * 1000
  let lastAttempt: number | null = null
  let pending = false
  let stopped = false
  const check = async () => {
    if (stopped || pending || document.visibilityState !== 'visible' || !navigator.onLine) return
    if (lastAttempt !== null && Date.now() - lastAttempt < interval) return
    pending = true
    lastAttempt = Date.now()
    try { await registration.update() } catch { /* Keep the active worker and retry later. */ }
    finally { pending = false }
  }
  const resume = () => { void check() }
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('online', resume)
  const timer = window.setInterval(resume, interval)
  resume()
  return () => {
    stopped = true
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('online', resume)
  }
}
