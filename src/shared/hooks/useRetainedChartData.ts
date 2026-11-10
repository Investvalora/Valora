import { useEffect, useRef } from 'react'

/** Mantém a série anterior durante a busca de outro período no mesmo contexto. */
export function useRetainedChartData<T, P extends string>(
  scope: string,
  period: P,
  data: T,
  isLoading: boolean,
) {
  const lastReady = useRef<{ scope: string; period: P; data: T } | null>(null)

  useEffect(() => {
    if (!isLoading) lastReady.current = { scope, period, data }
  }, [scope, period, data, isLoading])

  const retained = isLoading && lastReady.current?.scope === scope
  return retained ? { ...lastReady.current!, retained: true } : { scope, period, data, retained: false }
}
