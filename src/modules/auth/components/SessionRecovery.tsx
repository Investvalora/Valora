import { useEffect, useState } from 'react'
import { supabase } from '../../../shared/services/supabaseClient'
import { useAuthStore } from '../store'
import { useLocation } from 'react-router-dom'
import { isRevokedSession } from '../sessionRecovery'
import { Modal } from '../../../shared/components/Modal'

export function SessionRecovery() {
  const { pathname } = useLocation()
  const session = useAuthStore(state => state.session)
  const [problem, setProblem] = useState<'revoked' | 'unavailable' | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    let checking = false
    setProblem(null)
    if (!session) return
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return
      checking = true
      try {
        const { error } = await supabase.auth.getUser(session.access_token)
        if (active) setProblem(error ? (isRevokedSession(error) ? 'revoked' : 'unavailable') : null)
      } catch {
        if (active) setProblem('unavailable')
      } finally { checking = false }
    }
    void check()
    const visible = () => { if (document.visibilityState === 'visible') void check() }
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      window.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [session, retry])

  if (!session || !problem || pathname === '/login') return null
  if (problem === 'unavailable') return (
    <div role="status" className="fixed bottom-4 left-4 right-4 z-[200] rounded-xl border border-white/20 bg-[#1B1B1B] p-4 text-sm text-white shadow-xl">
      Não foi possível verificar sua sessão. Confira a conexão e tente novamente. Seus campos permanecem nesta tela.
      <button type="button" className="mt-3 min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/70 hover:bg-white/5 sm:ml-3" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>
    </div>
  )
  return (
    <Modal isOpen title="Entre novamente" dismissible={false} onClose={() => {}}>
        <p className="text-sm text-white/60">Sua sessão foi encerrada ou revogada. Para continuar, entre novamente. Ao sair desta tela, campos ainda não salvos serão perdidos.</p>
        <a href="/login?reauth=1" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">Entrar em outra aba</a>
        <button type="button" className="mt-3 min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/70 hover:bg-white/5 sm:ml-3" onClick={() => setRetry(value => value + 1)}>Já entrei; verificar</button>
    </Modal>
  )
}
