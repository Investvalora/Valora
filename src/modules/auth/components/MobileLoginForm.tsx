import { useLoginCooldown } from '../hooks/useLoginCooldown'
import { SessionEndedNotice } from './SessionEndedNotice'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginSchema } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'
import {
  MobileAuthLayout,
  GoogleLogo,
  mobileInput,
  mobilePrimaryBtn,
  mobileFieldError,
  mobileErrorBox,
  mobileAccentLink,
} from './MobileAuthLayout'

export function MobileLoginForm() {
  const cooldown = useLoginCooldown()
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const setSession = useAuthStore((s) => s.setSession)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const callbackError =
    new URLSearchParams(location.search).get('error') ??
    new URLSearchParams(location.hash.slice(1)).get('error')
  const oauthMessage =
    callbackError === 'access_denied'
      ? 'Login com Google cancelado. Tente novamente.'
      : callbackError
      ? 'Não foi possível concluir a autenticação. Tente novamente.'
      : ''

  const googleMutation = useMutation({
    mutationFn: authService.loginWithGoogle,
    onError: () =>
      setErrorMessage('Não foi possível entrar com Google. Tente email e senha.'),
  })

  const { register, handleSubmit, formState: { errors } } =
    useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })

  const loginMutation = useMutation({
    mutationFn: authService.login,
    retry: false,
    onSuccess: (data) => {
      setUser(data.user)
      setSession(data.session)
      navigate('/inicio')
    },
    onError: (error: Error) => {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setErrorMessage('Email ou senha incorretos')
      } else if (msg.includes('email not confirmed')) {
        setErrorMessage('Confirme seu email antes de entrar.')
      } else {
        setErrorMessage('Email ou senha incorretos')
      }
    },
  })

  const isPending = loginMutation.isPending || googleMutation.isPending

  return (
    <MobileAuthLayout logoId="login-v-gradient">
      <SessionEndedNotice />
      {/* Título */}
      <div className="mb-7">
        <h1 className="whitespace-nowrap text-[clamp(23px,7vw,30px)] font-bold leading-tight tracking-[-0.035em] text-white">
          Bem-vindo de volta.
        </h1>
        <p className="mt-2 text-[14px] text-white/45">
          Acesse sua carteira e análises.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => { setErrorMessage(''); if (!cooldown && !isPending) loginMutation.mutate(d) })} className="auth-form-enter flex flex-col gap-3.5" noValidate>
        {/* Email */}
        <div>
          <input
            id="m-email"
            type="email"
            autoComplete="email"
            placeholder="Seu email"
            aria-label="Email"
            aria-invalid={!!errors.email}
            {...register('email')}
            className={mobileInput}
          />
          {errors.email && <p className={mobileFieldError}>{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <div className="relative">
            <input
              id="m-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Sua senha"
              aria-label="Senha"
              aria-invalid={!!errors.password}
              {...register('password')}
              className={`${mobileInput} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p className={mobileFieldError}>{errors.password.message}</p>}
        </div>

        {/* Esqueci senha */}
        <div className="flex justify-end">
          <Link to="/recuperar-senha" className="text-[13px] font-medium text-[#60a5fa] transition-opacity hover:opacity-80">
            Esqueci minha senha
          </Link>
        </div>

        {(errorMessage || oauthMessage) && (
          <p role="alert" className={mobileErrorBox}>{errorMessage || oauthMessage}</p>
        )}

        {cooldown > 0 && <p role="status" className="text-sm text-amber-300">Muitas tentativas. Aguarde {cooldown}s antes de tentar novamente.</p>}
        {/* Entrar */}
        <button type="submit" disabled={isPending || cooldown > 0} className={mobilePrimaryBtn}>
          {loginMutation.isPending ? 'Entrando…' : cooldown ? `Aguarde ${cooldown}s` : 'Entrar'}
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-[12px] text-white/30">ou</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Google */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setErrorMessage(''); googleMutation.mutate() }}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.05] text-[15px] font-medium text-white transition-colors hover:bg-white/[0.09] disabled:opacity-50"
        >
          {googleMutation.isPending
            ? <span className="text-[14px] text-white/60">Conectando…</span>
            : <><GoogleLogo />Continuar com Google</>}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center">
        <p className="text-[13px] text-white/40">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className={mobileAccentLink}>Criar conta</Link>
        </p>
      </div>
    </MobileAuthLayout>
  )
}
