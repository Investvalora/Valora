import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useAuth } from '../../auth/hooks/useAuth'
import { deferPushPrompt, pushPromptKey, usePushNotifications } from '../hooks/usePushNotifications'

export function PushNotificationsPrompt() {
  const { user } = useAuth()
  const push = usePushNotifications()
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  let postponed = false
  if (user) {
    try { postponed = Number(localStorage.getItem(pushPromptKey(user.id))) > Date.now() } catch { /* Sem persistência, respeitar a sessão. */ }
  }
  const open = Boolean(user && dismissedFor !== user.id && !postponed && push.supported &&
    push.configured && push.ready && !push.enabled && !push.error && Notification.permission !== 'denied')

  function dismiss() {
    if (!user) return
    deferPushPrompt(user.id)
    setDismissedFor(user.id)
  }

  // Erros de ativação permanecem visíveis dentro do convite.
  const [attemptedFor, setAttemptedFor] = useState<string | null>(null)
  const showError = Boolean(user && attemptedFor === user.id && dismissedFor !== user.id && push.error)

  return <Modal isOpen={open || showError} title="Receba seus alertas" onClose={dismiss} dismissible={!push.busy}>
    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
      <BellRing size={24} aria-hidden="true" />
    </div>
    <p className="text-sm leading-relaxed text-nf-muted">Ative as notificações neste dispositivo para receber um aviso quando surgir um novo alerta no Valora, mesmo com o app fechado.</p>
    <p className="mt-3 text-xs text-nf-muted">Você pode alterar essa escolha depois, na página Alertas.</p>
    {push.error && <p role="alert" className="mt-4 text-sm text-red-300">{push.error}</p>}
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={dismiss} disabled={push.busy} className="min-h-11 rounded-xl border border-white/15 px-5 text-sm text-white disabled:opacity-50">Agora não</button>
      <button type="button" onClick={() => { setAttemptedFor(user?.id ?? null); void push.toggle() }} disabled={push.busy} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{push.busy ? 'Ativando...' : 'Ativar notificações'}</button>
    </div>
  </Modal>
}
