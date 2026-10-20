import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { loginSchema, LoginSchema } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'

export function LoginForm() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setUser(data.user)
      setSession(data.session)
      navigate('/inicio')
    },
    onError: (error: Error) => {
      console.error('Login error:', error)

      const message = error.message?.toLowerCase() ?? ''

      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid credentials')
      ) {
        setErrorMessage('Email ou senha incorretos')
      } else if (message.includes('email not confirmed')) {
        setErrorMessage('Confirme seu email antes de entrar. Verifique sua caixa de entrada.')
      } else {
        setErrorMessage('Email ou senha incorretos')
      }
    },
  })

  const onSubmit = (data: LoginSchema) => {
    setErrorMessage('')
    loginMutation.mutate(data)
  }

  return (
    <div className="login-page min-h-screen overflow-hidden bg-[#111315] text-white">
      <div className="login-page__glow" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[0.08em]">
          <img src="/icons/valora-512.png" alt="" className="h-6 w-6 rounded-[6px] object-contain" />
          VALORA
        </div>

        <div className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-24 lg:py-0">
          <section className="max-w-[520px]">
            <h1 className="max-w-[440px] text-[36px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[44px]">
              Invista com clareza e transparência.
            </h1>
            <p className="mt-5 max-w-[430px] text-[13px] leading-[1.45] text-[#a8adb1]">
              Sua ferramenta de apoio à decisão para investir de forma consciente: indicadores, score e preço-teto em um só lugar.
            </p>
            <ul className="mt-5 space-y-2 text-[12px] text-[#c5c9cc]">
              {['Cálculos transparentes, com detalhamento de cada critério', 'Score e preço-teto (Bazin e Graham) personalizáveis', 'Carteira, proventos e alertas consolidados'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[#1e7139] text-[#7ee39a]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="w-full max-w-[420px] justify-self-center rounded-xl border border-white/[0.1] bg-[#1b1b1d]/95 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)] lg:justify-self-end">
            <h2 className="text-[18px] font-semibold">Entrar no Valora</h2>
            <p className="mt-1 text-[10px] text-[#85878b]">Acesse sua carteira e suas análises.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="email" className="mb-1 block text-[10px] font-medium text-[#d8d8da]">E-mail</label>
                <input id="email" type="email" autoComplete="email" {...register('email')} placeholder="voce@email.com" className="login-input" />
                {errors.email && <p className="mt-1 text-[10px] text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-[10px] font-medium text-[#d8d8da]">Senha</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')} placeholder="••••••••" className="login-input pr-10" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9ca1] hover:text-white">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-[10px] text-red-400">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#85878b]">
                <label className="flex items-center gap-1.5"><input type="checkbox" className="h-3 w-3 accent-[#347cbc]" /> Manter conectado</label>
                <Link to="/recuperar-senha" className="text-[#7699ff] hover:text-white">Esqueci minha senha</Link>
              </div>

              {errorMessage && <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-300">{errorMessage}</p>}

              <button type="submit" disabled={loginMutation.isPending} className="w-full rounded-md bg-[#347cbc] py-2.5 text-[12px] font-semibold transition-colors hover:bg-[#438ed0] disabled:cursor-not-allowed disabled:opacity-60">
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-4 text-center text-[10px] text-[#85878b]">Ainda não tem uma conta? <Link to="/cadastro" className="text-[#7699ff] hover:text-white">Criar conta</Link></p>
            <p className="mt-3 text-center text-[8px] leading-[1.4] text-[#696b70]">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
