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
  const [verificationUnavailable, setVerificationUnavailable] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    let checking = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    // A retry/network failure cannot undo an already confirmed revocation.
    setVerificationUnavailable(false)
    if (!session) { setProblem(null); return }
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return
      checking = true
      try {
        const result = await Promise.race([
          supabase.auth.getUser(session.access_token),
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Session check timeout')), 15_000) }),
        ])
        const { error, data } = result
        if (active) {
          if (error && isRevokedSession(error)) setProblem('revoked')
          else if (error || !data?.user || data.user.id !== session.user.id) {
            setVerificationUnavailable(true)
            setProblem(previous => previous === 'revoked' ? previous : 'unavailable')
          } else { setProblem(null); setVerificationUnavailable(false) }
        }
      } catch {
        if (active) {
          setVerificationUnavailable(true)
          setProblem(previous => previous === 'revoked' ? previous : 'unavailable')
        }
      } finally { clearTimeout(timeout); checking = false }
    }
    void check()
    const visible = () => { if (document.visibilityState === 'visible') void check() }
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      clearTimeout(timeout)
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
        {verificationUnavailable && <p role="status" className="mt-3 text-sm text-white/60">Não foi possível verificar o novo login. Confira a conexão e tente novamente.</p>}
        <a href="/login?reauth=1" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">Entrar em outra aba</a>
        <button type="button" className="mt-3 min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/70 hover:bg-white/5 sm:ml-3" onClick={() => setRetry(value => value + 1)}>Já entrei; verificar</button>
    </Modal>
  )
}
