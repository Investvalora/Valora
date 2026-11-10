import { useCallback, useEffect, useRef, useState } from 'react'
import { readDraft, removeDraft, saveDraft } from '../utils/sessionDraft'

type Validator<T> = (value: unknown) => T | null

/** Session-only draft. Callers remount the form when its account/context changes. */
export function useFormDraft<T>(key: string | null, value: T, dirty: boolean, validate: Validator<T>) {
  const [candidate, setCandidate] = useState(() => key ? validate(readDraft(key)) : null)
  const [storageFailed, setStorageFailed] = useState(false)
  const edited = useRef(false)
  const serialized = JSON.stringify(value)
  useEffect(() => {
    if (!key) return
    if (dirty) {
      edited.current = true
      setCandidate(null)
      setStorageFailed(!saveDraft(key, JSON.parse(serialized)))
    } else if (edited.current) {
      removeDraft(key)
      setStorageFailed(false)
    }
  }, [key, dirty, serialized])
  const clear = useCallback(() => { if (key) removeDraft(key); setCandidate(null); setStorageFailed(false) }, [key])
  function restore() {
    const result = candidate
    setCandidate(null)
    return result
  }
  return { available: candidate !== null, storageFailed, clear, restore }
}
