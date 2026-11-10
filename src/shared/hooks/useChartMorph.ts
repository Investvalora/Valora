import { useEffect, useRef, useState } from 'react'

type Snapshot<T> = { scope: string; data: T }

/** Interpola os valores da curva, mantendo a anterior montada até o primeiro frame. */
export function useChartMorph<T>(
  scope: string,
  target: T,
  interpolate: (from: T, to: T, progress: number) => T,
  canInterpolate: (from: T, to: T) => boolean,
  enabled: boolean,
) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() => ({ scope, data: target }))
  const current = useRef(snapshot)

  useEffect(() => {
    const from = current.current
    const commit = (data: T) => {
      const next = { scope, data }
      current.current = next
      setSnapshot(next)
    }

    if (from.scope !== scope || from.data === target || !enabled || !canInterpolate(from.data, target) ||
      typeof window.requestAnimationFrame !== 'function') {
      if (from.scope !== scope || from.data !== target) commit(target)
      return
    }

    const started = performance.now()
    let lastPaint = 0
    let frameId = 0
    const frame = (now: number) => {
      const linear = Math.min(1, (now - started) / 360)
      if (linear === 1 || now - lastPaint >= 28) {
        lastPaint = now
        const eased = 1 - (1 - linear) ** 3
        commit(linear === 1 ? target : interpolate(from.data, target, eased))
      }
      if (linear < 1) frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [scope, target, interpolate, canInterpolate, enabled])

  return snapshot.scope === scope ? snapshot.data : target
}
