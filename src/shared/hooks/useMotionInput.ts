import { useEffect } from 'react'

/** Keyboard navigation is immediate; pointer motion remains a progressive enhancement. */
export function useMotionInput() {
  useEffect(() => {
    const keyboard = () => { document.documentElement.dataset.inputMode = 'keyboard' }
    const pointer = () => { document.documentElement.dataset.inputMode = 'pointer' }
    window.addEventListener('keydown', keyboard, true)
    window.addEventListener('pointerdown', pointer, true)
    return () => {
      window.removeEventListener('keydown', keyboard, true)
      window.removeEventListener('pointerdown', pointer, true)
      delete document.documentElement.dataset.inputMode
    }
  }, [])
}
