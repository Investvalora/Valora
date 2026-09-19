import { LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-200">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Sua conta</h1>
          <p className="text-sm text-slate-400">Preferências e segurança da sua conta.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dark-border bg-dark-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">E-mail</p>
        <p className="mt-1 text-sm text-slate-200">{user?.email ?? 'Não informado'}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-dark-border bg-dark-surface p-5">
        <h2 className="font-semibold text-white">Sessão</h2>
        <p className="mt-1 text-sm text-slate-400">Encerre a sessão neste dispositivo.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400/60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </button>
      </div>
    </section>
  )
}
