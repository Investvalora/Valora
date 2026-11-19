import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/** Animates a container, never remounts its forms or repeats on background refresh. */
export function MotionRegion({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    if (document.documentElement.dataset.inputMode === 'keyboard' || document.documentElement.dataset.viewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const animation = ref.current?.animate?.([{ opacity: 0.94, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' })
    return () => animation?.cancel()
  }, [pathname])
  return <div ref={ref} className={`min-w-0 ${className}`}>{children}</div>
}
