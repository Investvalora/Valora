import { useSyncExternalStore } from 'react'
import { loginThrottle } from '../services/loginThrottle'

export function useLoginCooldown() {
  return useSyncExternalStore(loginThrottle.subscribe, loginThrottle.remaining, () => 0)
}
