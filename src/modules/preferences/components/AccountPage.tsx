import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { authService } from '../../auth/services/authService'
import { PushNotificationsControl } from './PushNotificationsControl'

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function Detail({ label, value }: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 border-b border-white/[0.08] py-4">
      <dt className="text-xs text-white/45">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-white/85">{value}</dd>
    </div>
  )
}

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { data: profile } = useQuery({
    queryKey: ['account', 'profile', user?.id],
    queryFn: () => authService.getUserProfile(user!.id),
    enabled: Boolean(user?.id),
    retry: false,
  })

  const fullName = textValue(profile?.full_name) || textValue(user?.user_metadata?.full_name)
  const email = textValue(profile?.email) || textValue(user?.email)
  const phone = textValue(profile?.phone) || textValue(user?.user_metadata?.phone) || textValue(user?.phone)
  const displayName = fullName || email.split('@')[0] || 'Sua conta'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')

  const handleLogout = async () => {
    setIsLeaving(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.')
      setIsLeaving(false)
    }
  }

  return (
    <section className="w-full px-4 pb-12 pt-6 md:px-0 md:pt-10">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Perfil e conta</h1>
        <p className="mt-2 text-sm text-white/50">Seus dados e acesso ao Valora.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)] lg:gap-14">
        <div className="min-w-0">
          <div className="flex items-center gap-4 border-b border-white/[0.1] pb-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#A66AF4] text-lg font-semibold text-white shadow-[0_0_0_4px_rgba(166,106,244,0.12)]" aria-hidden="true">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{displayName}</h2>
              {email && <p className="mt-0.5 truncate text-sm text-white/50">{email}</p>}
            </div>
          </div>

          <h3 className="mt-7 text-sm font-semibold text-white">Dados pessoais</h3>
          <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">
            <Detail label="Nome completo" value={fullName || 'Não informado'} />
            <Detail label="E-mail" value={email || 'Não informado'} />
            <Detail label="Telefone" value={phone || 'Não informado'} />
          </dl>
        </div>

        <div className="min-w-0 border-t border-white/[0.1] lg:border-t-0">
          <PushNotificationsControl />

          <section className="border-b border-white/[0.1] py-6 lg:pt-0">
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-white/50" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Mudar minha senha</h2>
            </div>
            <p className="mt-2 text-sm text-white/45">Em breve você poderá alterar sua senha por aqui.</p>
            <button type="button" disabled className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-white/[0.1] px-4 text-sm font-medium text-white/35 disabled:cursor-not-allowed">
              Alterar senha · em breve
            </button>
          </section>

          <section className="py-6">
            <h2 className="text-sm font-semibold text-white">Encerrar sessão</h2>
            <p className="mt-2 text-sm text-white/45">Encerre o acesso neste dispositivo.</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLeaving}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:border-rose-400/50 hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              {isLeaving ? 'Saindo…' : 'Sair da conta'}
            </button>
            {logoutError && <p role="alert" className="mt-3 text-sm text-rose-300">{logoutError}</p>}
          </section>
        </div>
      </div>
    </section>
  )
}
