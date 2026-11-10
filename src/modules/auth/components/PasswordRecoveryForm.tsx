import { recoveryErrorMessage } from '../authErrorMessage'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PasswordRecoverySchema, passwordRecoverySchema } from '../schemas/passwordRecoverySchema'
import { authService } from '../services/authService'
import { AuthLayout } from './AuthLayout'
import { authButton, authErrorBox, authFieldError, authInput, authLabel, authLink } from './authStyles'

import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { MobilePasswordRecoveryForm } from './MobilePasswordRecoveryForm'

export function PasswordRecoveryForm() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobilePasswordRecoveryForm />
  return <DesktopPasswordRecoveryForm />
}

function DesktopPasswordRecoveryForm() {
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordRecoverySchema>({
    resolver: zodResolver(passwordRecoverySchema),
  })

  const recoveryMutation = useMutation({
    mutationFn: authService.requestPasswordRecovery,
    onSuccess: () => {
      setErrorMessage('')
      setSuccessMessage('Se o e-mail informado estiver cadastrado, você receberá um link com as instruções para redefinir sua senha.')
    },
    onError: (error: Error) => {
      console.error('Password recovery error:', error)
      setSuccessMessage('')

      setErrorMessage(recoveryErrorMessage(error))
    },
  })

  const onSubmit = (data: PasswordRecoverySchema) => {
    setSuccessMessage('')
    setErrorMessage('')
    recoveryMutation.mutate(data.email)
  }

  return (
    <AuthLayout
      prioritizeFormOnMobile
      hideHeader={!!successMessage}
      title="Recuperar senha"
      description="Informe seu email para receber as instruções de redefinição."
      footer={successMessage
        ? <Link to="/login" className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/20 px-5 font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9bdb]">Voltar</Link>
        : <>Lembrou sua senha? <Link to="/login" className={authLink}>Voltar para login</Link></>}
    >
      {successMessage ? (
        <div>
          <div role="status" className="flex min-h-[174px] flex-col items-center justify-center text-center">
            <Check className="auth-success-check h-12 w-12 text-[#7ee39a]" strokeWidth={2.5} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Email enviado</h2>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-[#a8adb1]">{successMessage} Confira sua caixa de entrada e spam. Use o link mais recente, uma única vez. Se ele estiver inválido, volte à recuperação para solicitar outro.</p>
          </div>
          <button type="button" disabled className={`${authButton} mt-5`}>Enviar instruções</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className={authLabel}>Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'recovery-email-error' : undefined} className={authInput} placeholder="seu@email.com" />
            {errors.email && <p id="recovery-email-error" className={authFieldError}>{errors.email.message}</p>}
          </div>

          {errorMessage && <p role="alert" className={authErrorBox}>{errorMessage}</p>}

          <button type="submit" disabled={recoveryMutation.isPending} className={authButton}>
            {recoveryMutation.isPending ? 'Enviando...' : 'Enviar instruções'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
