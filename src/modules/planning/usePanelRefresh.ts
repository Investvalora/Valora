import { useEffect, useRef, useState } from 'react'
export const PANEL_REFRESH_MS = 5 * 60_000
/** Consulta somente dados salvos, sem disparar coleta ou recalcular histórico a cada intervalo. */
export function usePanelRefresh(refresh: () => Promise<unknown>, enabled: boolean) {
  const callback = useRef(refresh)
  callback.current = refresh
  const [nextCheck, setNextCheck] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    let running = false
    const available = () => document.visibilityState !== 'hidden' && navigator.onLine
    const schedule = () => {
      clearTimeout(timer)
      if (disposed) return
      setPaused(!available())
      if (!enabled || !available()) { setNextCheck(null); return }
      const due = Date.now() + PANEL_REFRESH_MS
      setNextCheck(due)
      timer = setTimeout(() => { void run() }, PANEL_REFRESH_MS)
    }
    const run = async () => {
      if (!available() || !enabled || running || disposed) { schedule(); return }
      running = true
      setNextCheck(null)
      try { await callback.current() } catch { /* Query states present failures; never treat them as new data. */ }
      finally { running = false; schedule() }
    }
    const visibility = () => { if (available()) void run(); else schedule() }
    schedule()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('online', visibility)
    window.addEventListener('offline', visibility)
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', visibility); window.removeEventListener('offline', visibility) }
  }, [enabled])
  return { nextCheck, paused }
}
