import { recoveryErrorMessage } from '../authErrorMessage'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { passwordRecoverySchema, type PasswordRecoverySchema } from '../schemas/passwordRecoverySchema'
import { authService } from '../services/authService'
import {
  MobileAuthLayout,
  mobileInput,
  mobilePrimaryBtn,
  mobileFieldError,
  mobileErrorBox,
  mobileAccentLink,
} from './MobileAuthLayout'

export function MobilePasswordRecoveryForm() {
  const [successEmail, setSuccessEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { register, handleSubmit, formState: { errors } } =
    useForm<PasswordRecoverySchema>({ resolver: zodResolver(passwordRecoverySchema) })

  const recoveryMutation = useMutation({
    mutationFn: authService.requestPasswordRecovery,
    onSuccess: (_, email) => {
      setErrorMessage('')
      setSuccessEmail(email)
    },
    onError: (error: Error) => {
      setSuccessEmail('')
      setErrorMessage(recoveryErrorMessage(error))
    },
  })

  return (
    <MobileAuthLayout logoId="recovery-v-gradient">
      {successEmail ? (
        /* ── Estado: email enviado ── */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#2563eb]/10">
            <Mail className="h-8 w-8 text-[#60a5fa]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h2 className="text-[22px] font-bold text-white">Email enviado</h2>
          <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-white/50">
            Enviamos as instruções para{' '}
            <span className="font-medium text-white">{successEmail}</span>.
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
              Recuperar senha.
            </h1>
            <p className="mt-2 text-[14px] text-white/45">
              Informe seu email para receber o link de redefinição.
            </p>
          </div>

          <form
            onSubmit={handleSubmit((d) => {
              setErrorMessage('')
              recoveryMutation.mutate(d.email)
            })}
            className="auth-form-enter flex flex-col gap-3.5"
            noValidate
          >
            <div>
              <input
                id="m-recovery-email"
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

            {errorMessage && (
              <p role="alert" className={mobileErrorBox}>{errorMessage}</p>
            )}

            <button type="submit" disabled={recoveryMutation.isPending} className={`${mobilePrimaryBtn} mt-1`}>
              {recoveryMutation.isPending ? 'Enviando…' : 'Enviar instruções'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center">
            <p className="text-[13px] text-white/40">
              Lembrou a senha?{' '}
              <Link to="/login" className={mobileAccentLink}>Voltar para login</Link>
            </p>
          </div>
        </>
      )}
    </MobileAuthLayout>
  )
}
