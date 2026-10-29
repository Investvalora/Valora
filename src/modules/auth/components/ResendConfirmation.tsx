import { useEffect, useState } from 'react'
import { authService } from '../services/authService'

export function ResendConfirmation({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!remaining) return
    const timer = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  async function resend() {
    if (busy || remaining > 0) return
    setBusy(true); setMessage(''); setError('')
    try {
      await authService.resendConfirmation(email)
      setMessage('Se houver um cadastro pendente para este email, enviaremos a confirmação. Confira também o spam.')
      setRemaining(60)
    } catch {
      setError('Não foi possível reenviar agora. Aguarde antes de tentar novamente.')
      setRemaining(60)
    } finally { setBusy(false) }
  }
  return <div className="mt-3 text-sm">
    <button type="button" onClick={() => void resend()} disabled={busy || remaining > 0} className="min-h-11 text-[#8baaff] hover:text-white disabled:opacity-50">
      {busy ? 'Enviando...' : remaining > 0 ? `Reenviar em ${remaining}s` : 'Reenviar email de confirmação'}
    </button>
    {message && <p role="status" className="mt-2 text-xs text-emerald-300">{message}</p>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
  </div>
}
