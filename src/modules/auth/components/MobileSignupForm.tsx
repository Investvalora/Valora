import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { signupSchema, type SignupSchema } from '../schemas/signupSchema'
import { PASSWORD_HELP } from '../schemas/passwordSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'
import {
  MobileAuthLayout,
  mobileInput,
  mobilePrimaryBtn,
  mobileFieldError,
  mobileErrorBox,
  mobileAccentLink,
} from './MobileAuthLayout'

export function MobileSignupForm() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setSession = useAuthStore((s) => s.setSession)
  const [errorMessage, setErrorMessage] = useState('')
  const [existingEmail, setExistingEmail] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } =
    useForm<SignupSchema>({ resolver: zodResolver(signupSchema) })

  const signupMutation = useMutation({
    mutationFn: authService.signup,
    onSuccess: (data, variables) => {
      if (!data.session) {
        setConfirmationEmail(variables.email)
        return
      }
      setUser(data.user)
      setSession(data.session)
      navigate('/carteira')
    },
    onError: (error: Error) => {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('já está cadastrado')) {
        setExistingEmail(true)
        setErrorMessage('Este email já está cadastrado.')
      } else if (msg.includes('invalid email')) {
        setErrorMessage('Email inválido.')
      } else {
        setErrorMessage(error.message || 'Erro ao criar conta. Tente novamente.')
      }
    },
  })

  const onSubmit = (data: SignupSchema) => {
    setErrorMessage('')
    setExistingEmail(false)
    setConfirmationEmail('')
    signupMutation.mutate(data)
  }

  return (
    <MobileAuthLayout logoId="signup-v-gradient">
      {confirmationEmail ? (
        /* ── Estado: email de confirmação enviado ── */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h2 className="text-[22px] font-bold text-white">Confirme seu email</h2>
          <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-white/50">
            Enviamos um link para{' '}
            <span className="font-medium text-white">{confirmationEmail}</span>.
            Verifique sua caixa de entrada.
          </p>
          <Link
            to="/login"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.05] text-[15px] font-medium text-white"
          >
            Voltar para login
          </Link>
        </div>
      ) : (
        <>
          {/* Título */}
          <div className="mb-7">
            <h1 className="whitespace-nowrap text-[clamp(23px,7vw,30px)] font-bold leading-tight tracking-[-0.035em] text-white">
              Crie sua conta.
            </h1>
            <p className="mt-2 text-[14px] text-white/45">
              Comece a gerenciar seus investimentos.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form-enter flex flex-col gap-3.5" noValidate>
            {/* Nome */}
            <div>
              <input
                id="m-fullName"
                type="text"
                autoComplete="name"
                placeholder="Nome completo"
                aria-label="Nome completo"
                aria-invalid={!!errors.fullName}
                {...register('fullName')}
                className={mobileInput}
              />
              {errors.fullName && <p className={mobileFieldError}>{errors.fullName.message}</p>}
            </div>

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

            {/* Telefone */}
            <div>
              <input
                id="m-phone"
                type="tel"
                autoComplete="tel"
                placeholder="Telefone (opcional)"
                aria-label="Telefone"
                aria-invalid={!!errors.phone}
                {...register('phone')}
                className={mobileInput}
              />
              {errors.phone && <p className={mobileFieldError}>{errors.phone.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <input
                id="m-password"
                type="password"
                autoComplete="new-password"
                placeholder="Senha (mín. 8 caracteres)"
                aria-label="Senha"
                aria-invalid={!!errors.password}
                {...register('password')}
                className={mobileInput}
              />
              <p className="mt-1.5 px-1 text-[12px] text-white/35">{PASSWORD_HELP}</p>
              {errors.password && <p className={mobileFieldError}>{errors.password.message}</p>}
            </div>

            {/* Confirmar senha */}
            <div>
              <input
                id="m-confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirmar senha"
                aria-label="Confirmar senha"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
                className={mobileInput}
              />
              {errors.confirmPassword && <p className={mobileFieldError}>{errors.confirmPassword.message}</p>}
            </div>

            {errorMessage && (
              <div role="alert" className={mobileErrorBox}>
                <p>{errorMessage}</p>
                {existingEmail && (
                  <p className="mt-2 text-xs">
                    <Link to="/login" className={mobileAccentLink}>Faça login</Link>
                    {' ou '}
                    <Link to="/recuperar-senha" className={mobileAccentLink}>recupere sua senha</Link>.
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={signupMutation.isPending} className={`${mobilePrimaryBtn} mt-1`}>
              {signupMutation.isPending ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center">
            <p className="text-[13px] text-white/40">
              Já tem conta?{' '}
              <Link to="/login" className={mobileAccentLink}>Faça login</Link>
            </p>
          </div>
        </>
      )}
    </MobileAuthLayout>
  )
}
