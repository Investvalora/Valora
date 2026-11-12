let pending = 0
export function beginIntentionalLogout() { pending += 1 }
export function endIntentionalLogout() { pending = Math.max(0, pending - 1) }
export function isIntentionalLogout() { return pending > 0 }
