const PREFIX = 'valora:draft:v1:'
const MAX_AGE = 8 * 60 * 60 * 1000
export function draftKey(userId: string, walletId: string, form: string) {
  return `${PREFIX}${userId}:${walletId}:${form}`
}
export function readDraft(key: string): unknown {
  return readStoredDraft(key, false)
}
function readStoredDraft(key: string, persistent: boolean): unknown {
  try {
    const storage = persistent ? localStorage : sessionStorage
    const item = JSON.parse(storage.getItem(key) ?? 'null')
    if (!item || !Number.isFinite(item.time) || Date.now() - item.time > MAX_AGE || item.time > Date.now()) {
      storage.removeItem(key)
      return null
    }
    return item.value
  } catch { return null }
}
export function saveDraft(key: string, value: unknown) {
  return saveStoredDraft(key, value, false)
}
function saveStoredDraft(key: string, value: unknown, persistent: boolean) {
  try {
    const text = JSON.stringify({ time: Date.now(), value })
    if (text.length > 500_000) return false
    const storage = persistent ? localStorage : sessionStorage
    storage.setItem(key, text)
    return true
  } catch { return false }
}
export function removeDraft(key: string) { try { sessionStorage.removeItem(key) } catch { /* Storage can be disabled. */ } }
// Opt-in for the quick transaction only; existing tab-scoped forms keep their contract.
export function readDeviceDraft(key: string): unknown {
  return readStoredDraft(key, true) ?? readDraft(key)
}
export function saveDeviceDraft(key: string, value: unknown) {
  const saved = saveStoredDraft(key, value, true)
  if (saved) removeDraft(key)
  return saved
}
export function removeDeviceDraft(key: string) {
  try { localStorage.removeItem(key) } catch { /* Storage can be disabled. */ }
  removeDraft(key)
}
export function clearSessionDrafts() {
  try { Object.keys(sessionStorage).filter(key => key.startsWith(PREFIX)).forEach(removeDraft) } catch { /* Keep authentication available. */ }
  try { Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key)) } catch { /* Keep authentication available. */ }
}
