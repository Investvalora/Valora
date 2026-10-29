import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '../../auth/services/authService'
import { profileSchema } from '../../auth/schemas/profileSchema'
import { useAuthStore } from '../../auth/store'
import { useAuth } from '../../auth/hooks/useAuth'

export function EditProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(fullName)
  const [number, setNumber] = useState(phone)
  const [newEmail, setNewEmail] = useState('')
  const [emailOpen, setEmailOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#262626] px-3 text-white'

  async function save(event: FormEvent) {
    event.preventDefault()
    const values = profileSchema.safeParse({ fullName: name, phone: number })
    if (!values.success) { setError(values.error.issues[0].message); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const updated = await authService.updateProfile(values.data)
      useAuthStore.getState().setUser(updated)
      await queryClient.invalidateQueries({ queryKey: ['account', 'profile', user?.id] })
      setEditing(false); setMessage('Dados pessoais atualizados.')
    } catch { setError('Não foi possível atualizar os dados. Tente novamente.') }
    finally { setBusy(false) }
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    if (newEmail.trim().toLowerCase() === email.toLowerCase()) { setError('Informe um email diferente do atual.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const updated = await authService.requestEmailChange(newEmail)
      useAuthStore.getState().setUser(updated)
      await queryClient.invalidateQueries({ queryKey: ['account', 'profile', user?.id] })
      setMessage(updated.email?.toLowerCase() === newEmail.trim().toLowerCase()
        ? 'Email atualizado.'
        : 'Solicitação enviada. Confira o email atual e o novo, inclusive o spam, e siga as instruções de confirmação. O endereço atual continua válido até a conclusão.')
      setEmailOpen(false); setNewEmail('')
    } catch { setError('Não foi possível solicitar a troca. Confira o endereço e tente novamente mais tarde.') }
    finally { setBusy(false) }
  }

  return <div className="mt-5 space-y-4">
    {!editing ? <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white" onClick={() => { setName(fullName); setNumber(phone); setError(''); setMessage(''); setEditing(true); setEmailOpen(false) }}>Editar dados pessoais</button> : <form onSubmit={save} className="space-y-3" noValidate>
      <label className="block text-sm text-white/75">Nome completo<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={120} disabled={busy} className={inputClass} /></label>
      <label className="block text-sm text-white/75">Telefone (opcional)<input type="tel" autoComplete="tel" value={number} onChange={e => setNumber(e.target.value)} maxLength={30} disabled={busy} aria-describedby="profile-phone-help" className={inputClass} /></label>
      <p id="profile-phone-help" className="text-xs text-white/45">DDD + número, ou +DDI para outro país. Deixe vazio para remover.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar dados'}</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setError('') }} className="min-h-11 px-3 text-sm text-white/60">Cancelar</button></div>
    </form>}
    {!emailOpen ? <button type="button" disabled={busy} onClick={() => { setEmailOpen(true); setEditing(false); setError(''); setMessage('') }} className="block min-h-11 text-sm text-nf-blue">Alterar email</button> : <form onSubmit={changeEmail} className="space-y-3">
      <label className="block text-sm text-white/75">Novo email<input type="email" autoComplete="email" required maxLength={254} value={newEmail} onChange={e => setNewEmail(e.target.value)} disabled={busy} className={inputClass} /></label>
      <p className="text-xs text-white/45">A troca pode exigir confirmação no endereço atual e no novo.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enviando...' : 'Solicitar troca de email'}</button><button type="button" disabled={busy} onClick={() => { setEmailOpen(false); setNewEmail(''); setError('') }} className="min-h-11 px-3 text-sm text-white/60">Cancelar</button></div>
    </form>}
    {user?.new_email && <p className="text-xs text-amber-200">Troca pendente de confirmação para {user.new_email}.</p>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {message && <p role="status" className="text-sm text-nf-green">{message}</p>}
  </div>
}
