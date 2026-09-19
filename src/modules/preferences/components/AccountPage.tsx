import { useEffect, useRef, useState } from 'react'
import { Camera, Check, LoaderCircle, LogOut, Mail, Pencil, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useAvatarUrl, useProfile, useUpdateProfile, useUploadAvatar } from '../hooks/useProfile'

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'VC'
}

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const profileQuery = useProfile()
  const uploadAvatar = useUploadAvatar()
  const updateProfile = useUpdateProfile()
  const profile = profileQuery.data
  const fallbackName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  const displayName = profile?.full_name || fallbackName || user?.email?.split('@')[0] || 'Sua conta'
  const avatarUrl = useAvatarUrl(profile?.avatar_path).data
  const savedName = (profile?.full_name || fallbackName).trim()

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
  }, [profile?.full_name])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fullName = name.trim()
    if (fullName === savedName) return

    if (fullName.length < 2) {
      setFeedback('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    try {
      setFeedback(null)
      await updateProfile.mutateAsync(fullName)
      setFeedback('Nome atualizado com sucesso.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível atualizar seu nome.')
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setFeedback(null)
      await uploadAvatar.mutateAsync(file)
      setFeedback('Foto de perfil atualizada.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
    } finally {
      event.target.value = ''
    }
  }

  const isSaving = updateProfile.isPending || uploadAvatar.isPending
  const hasNameChanged = name.trim() !== savedName
  const hasSuccessFeedback = feedback?.includes('sucesso') || feedback?.includes('atualizada')

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-6">
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Sua conta</h1>
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative shrink-0">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-bold text-slate-950 ring-4 ring-slate-800">
                {avatarUrl ? <img src={avatarUrl} alt={`Foto de ${displayName}`} className="h-full w-full object-cover" /> : getInitials(displayName)}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatar.isPending} className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-slate-900 bg-white text-slate-900 transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-300" aria-label="Alterar foto de perfil">
                {uploadAvatar.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="sr-only" />
            </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="truncate text-lg font-semibold text-white">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-slate-400">{user?.email ?? 'E-mail não informado'}</p>
              <p className="mt-3 text-xs text-slate-500">JPG, PNG ou WebP · até 2 MB</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <form onSubmit={handleSaveName} className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-300"><UserRound className="h-5 w-5" /></span>
            <div><h2 className="font-semibold text-white">Informações pessoais</h2><p className="mt-1 text-sm text-slate-400">Esses dados identificam sua conta no aplicativo.</p></div>
          </div>
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Nome de usuário</span>
              <span className="mt-1 block text-xs text-slate-500">O nome exibido no Valora.</span>
              <div className="relative mt-2"><Pencil className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} disabled={profileQuery.isLoading} className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-wait disabled:opacity-60" placeholder="Como você quer ser chamado?" /></div>
            </label>
            <div>
              <span className="text-sm font-medium text-slate-200">E-mail</span>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-400"><Mail className="h-4 w-4 text-slate-500" /><span className="truncate">{user?.email ?? 'Não informado'}</span></div>
              <p className="mt-2 text-xs text-slate-500">O e-mail é usado para acesso e comunicações de segurança.</p>
            </div>
          </div>
          {feedback && <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${hasSuccessFeedback ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`} role="status">{feedback}</p>}
          <button type="submit" disabled={isSaving || profileQuery.isLoading || !hasNameChanged} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900">
            {updateProfile.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar alterações
          </button>
        </form>
        <button type="button" onClick={handleLogout} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-red-300 transition-colors hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400/60"><LogOut className="h-4 w-4" /> Sair da conta</button>
      </div>
    </section>
  )
}
