import { useAuthStore } from '../store'

export function SessionEndedNotice() {
  const ended = useAuthStore(state => state.sessionEnded)
  if (!ended) return null
  return <p role="status" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Sua sessão foi encerrada. Entre novamente para continuar.</p>
}
