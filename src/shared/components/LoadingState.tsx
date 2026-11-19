import { useLayoutEffect, useRef } from 'react'

type Props = {
  label?: string
  variant?: 'inline' | 'table' | 'chart' | 'page' | 'form'
  className?: string
}

/** Reserved space while data is unknown. No fabricated values or percentages. */
export function LoadingState({ label = 'Carregando…', variant = 'inline', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    return () => {
      if (!parent?.isConnected || document.documentElement.dataset.inputMode === 'keyboard' || document.documentElement.dataset.viewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      parent.animate?.([{ opacity: 0.94 }, { opacity: 1 }], { duration: 140, easing: 'cubic-bezier(0.22,1,0.36,1)' })
    }
  }, [])
  return <div ref={ref} role="status" aria-busy="true" className={`ui-loading ui-loading--${variant} ${className}`}>
    <span className="ui-loading-label">{label}</span>
    <div aria-hidden="true" className="ui-loading-shapes">
      {Array.from({ length: variant === 'page' ? 6 : variant === 'table' ? 4 : 3 }, (_, i) =>
        <span key={i} className="ui-skeleton" />)}
    </div>
  </div>
}
