import { useEffect, useRef, useState, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react'

/** Dois pontos de parada; o gesto fica restrito à alça para preservar a rolagem do texto. */
export function useInformationSheet(enabled: boolean, isOpen: boolean) {
  const [expanded, setExpanded] = useState(false)
  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const gesture = useRef<{ pointerId: number; startY: number; initial: number; travel: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    if (!isOpen || !enabled) {
      setExpanded(false)
      setDragProgress(null)
      gesture.current = null
      dragged.current = false
    }
  }, [isOpen, enabled])

  const snap = (next: boolean) => {
    setExpanded(next)
    setDragProgress(null)
    gesture.current = null
  }

  const progressFor = (clientY: number) => {
    const current = gesture.current
    return current ? Math.max(0, Math.min(1, current.initial + (current.startY - clientY) / current.travel)) : Number(expanded)
  }

  return {
    expanded,
    progress: dragProgress ?? Number(expanded),
    dragging: dragProgress !== null,
    handleProps: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!enabled || event.button !== 0 || event.isPrimary === false) return
        const panel = event.currentTarget.closest('[role="dialog"]')
        const available = panel?.parentElement?.clientHeight || window.visualViewport?.height || window.innerHeight
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        const compactHeight = Math.min(21 * fontSize, window.innerHeight / 2)
        gesture.current = { pointerId: event.pointerId, startY: event.clientY, initial: Number(expanded), travel: Math.max(120, available - compactHeight - 32) }
        dragged.current = false
        event.currentTarget.setPointerCapture?.(event.pointerId)
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current
        if (!current || current.pointerId !== event.pointerId) return
        if (Math.abs(current.startY - event.clientY) < 6 && !dragged.current) return
        dragged.current = true
        setDragProgress(progressFor(event.clientY))
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current
        if (!current || current.pointerId !== event.pointerId) return
        const delta = current.startY - event.clientY
        dragged.current = dragged.current || Math.abs(delta) >= 6
        const next = Math.abs(delta) >= 48 ? delta > 0 : progressFor(event.clientY) >= 0.5
        snap(next)
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      },
      onPointerCancel() { snap(expanded) },
      onLostPointerCapture() { if (gesture.current) snap(expanded) },
      onClick(event: MouseEvent<HTMLButtonElement>) {
        if (dragged.current && event.detail > 0) return
        snap(!expanded)
      },
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          snap(event.key === 'ArrowUp')
        }
      },
    },
  }
}
