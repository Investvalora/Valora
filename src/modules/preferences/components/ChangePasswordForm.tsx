import { useState, type FormEvent } from 'react'
import { authService } from '../../auth/services/authService'
import { PASSWORD_HELP, passwordSchema } from '../../auth/schemas/passwordSchema'

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [nonce, setNonce] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-[#262626] px-3 text-white'

  async function sendCode() {
    setPending(true)
    setError('')
    try {
      await authService.requestPasswordChangeCode()
      setMessage('Código enviado ao email da sua conta. Confira também o spam.')
    } catch {
      setError('Não foi possível enviar o código. Aguarde e tente novamente.')
    } finally { setPending(false) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    const result = passwordSchema.safeParse(password)
    if (!result.success) { setError(result.error.issues[0].message); return }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return }
    setPending(true)
    try {
      await authService.changePassword(password, needsCode ? nonce.trim() : undefined)
      setPassword('')
      setConfirmation('')
      setNonce('')
      setNeedsCode(false)
      setOpen(false)
      setMessage('Senha alterada com sucesso.')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      if (code === 'reauthentication_needed') {
        setNeedsCode(true)
        setError('Confirme sua identidade: envie um código ao seu email e informe-o abaixo.')
      } else if (code === 'reauthentication_not_valid') {
        setError('Código inválido ou expirado. Solicite outro código.')
      } else if (code === 'same_password') {
        setError('Escolha uma senha diferente da atual.')
      } else {
        setError('Não foi possível alterar a senha. Confira os dados e tente novamente.')
      }
    } finally { setPending(false) }
  }

  return <div className="mt-3">
    {!open ? <button type="button" onClick={() => { setOpen(true); setMessage('') }} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white">Alterar senha</button> :
      <form onSubmit={submit} className="space-y-3">
        <p id="change-password-help" className="text-xs text-white/50">{PASSWORD_HELP}</p>
        <label className="block text-sm text-white/75">Nova senha<input aria-describedby="change-password-help" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={256} disabled={pending} className={inputClass} /></label>
        <label className="block text-sm text-white/75">Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required maxLength={256} disabled={pending} className={inputClass} /></label>
        {needsCode && <div className="space-y-2">
          <button type="button" onClick={() => void sendCode()} disabled={pending} className="min-h-11 text-sm text-nf-blue disabled:opacity-50">Enviar novo código por email</button>
          <label className="block text-sm text-white/75">Código de confirmação<input autoComplete="one-time-code" value={nonce} onChange={(e) => setNonce(e.target.value)} required disabled={pending} className={inputClass} /></label>
        </div>}
        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-nf-purple px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Aguarde…' : 'Salvar nova senha'}</button>
          <button type="button" disabled={pending} onClick={() => { setOpen(false); setPassword(''); setConfirmation(''); setNonce(''); setError(''); setMessage(''); setNeedsCode(false) }} className="min-h-11 px-2 text-sm text-white/60">Cancelar</button>
        </div>
      </form>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-nf-green">{message}</p>}
  </div>
}
