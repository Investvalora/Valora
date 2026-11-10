const PREFIX = 'valora:draft:v1:'
const MAX_AGE = 8 * 60 * 60 * 1000
export function draftKey(userId: string, walletId: string, form: string) {
  return `${PREFIX}${userId}:${walletId}:${form}`
}
export function readDraft(key: string): unknown {
  try {
    const item = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (!item || !Number.isFinite(item.time) || Date.now() - item.time > MAX_AGE || item.time > Date.now()) {
      sessionStorage.removeItem(key)
      return null
    }
    return item.value
  } catch { return null }
}
export function saveDraft(key: string, value: unknown) {
  try {
    const text = JSON.stringify({ time: Date.now(), value })
    if (text.length > 500_000) return false
    sessionStorage.setItem(key, text)
    return true
  } catch { return false }
}
export function removeDraft(key: string) { try { sessionStorage.removeItem(key) } catch { /* Storage can be disabled. */ } }
export function clearSessionDrafts() {
  try { Object.keys(sessionStorage).filter(key => key.startsWith(PREFIX)).forEach(removeDraft) } catch { /* Keep authentication available. */ }
}
