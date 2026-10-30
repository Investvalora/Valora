import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { signupSchema, SignupSchema } from '../schemas/signupSchema'
import { PASSWORD_HELP } from '../schemas/passwordSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'
import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { ResendConfirmation } from './ResendConfirmation'
import { AuthLayout } from './AuthLayout'
import { authButton, authErrorBox, authFieldError, authInput, authLabel, authLink } from './authStyles'

export function SignupForm() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [existingEmail, setExistingEmail] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
  })

  const signupMutation = useMutation({
    mutationFn: authService.signup,
    onSuccess: (data, variables) => {
      if (!data.session) {
        setConfirmationEmail(variables.email)
        return
      }

      setUser(data.user)
      setSession(data.session)
      navigate('/inicio', { replace: true })
    },
    onError: (error: Error) => {
      console.error('Signup error:', error)

      const message = error.message?.toLowerCase() ?? ''

      if (message.includes('already registered') || message.includes('já está cadastrado')) {
        setExistingEmail(true)
        setErrorMessage('Este email já está cadastrado.')
      } else if (message.includes('invalid email')) {
        setErrorMessage('Email inválido')
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
    <AuthLayout
      prioritizeFormOnMobile
      hideHeader={!!confirmationEmail}
      title="Criar conta"
      description="Comece a gerenciar seus investimentos."
      footer={confirmationEmail
        ? <Link to="/login" className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/20 px-5 font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9bdb]">Voltar para login</Link>
        : <>Já tem uma conta? <Link to="/login" className={authLink}>Faça login</Link></>}
    >
      {confirmationEmail ? (
        <div>
          <div role="status" className="flex min-h-[174px] flex-col items-center justify-center text-center">
            <Check className="auth-success-check h-12 w-12 text-[#7ee39a]" strokeWidth={2.5} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Confirme seu email</h2>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-[#a8adb1]">
              Verifique a caixa de entrada de <span className="font-medium text-white">{confirmationEmail}</span> e confirme seu endereço para continuar.
            </p>
          </div>
          <ResendConfirmation email={confirmationEmail} />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="fullName" className={authLabel}>Nome completo</label>
            <input id="fullName" type="text" autoComplete="name" {...register('fullName')} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'signup-name-error' : undefined} className={authInput} placeholder="Seu nome completo" />
            {errors.fullName && <p id="signup-name-error" className={authFieldError}>{errors.fullName.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className={authLabel}>Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'signup-email-error' : undefined} className={authInput} placeholder="seu@email.com" />
            {errors.email && <p id="signup-email-error" className={authFieldError}>{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className={authLabel}>Telefone <span className="font-normal text-white/35">(opcional)</span></label>
            <input id="phone" type="tel" autoComplete="tel" maxLength={30} {...register('phone')} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'signup-phone-error' : 'signup-phone-help'} className={authInput} placeholder="(11) 99999-9999" />
            <p id="signup-phone-help" className="mt-1 text-xs text-white/45">DDD + número. Para outro país, use +DDI.</p>
            {errors.phone && <p id="signup-phone-error" className={authFieldError}>{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className={authLabel}>Senha</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'signup-password-error' : undefined} className={`${authInput} pr-12`} placeholder="Mínimo 8 caracteres" />
              <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9b9ca1] hover:text-white">
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-white/50">{PASSWORD_HELP}</p>
            {errors.password && <p id="signup-password-error" className={authFieldError}>{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className={authLabel}>Confirmar senha</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined} className={`${authInput} pr-12`} placeholder="Repita a senha" />
              <button type="button" aria-label={showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={showConfirmation} onClick={() => setShowConfirmation(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9b9ca1] hover:text-white">
                {showConfirmation ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && <p id="signup-confirm-error" className={authFieldError}>{errors.confirmPassword.message}</p>}
          </div>

          {errorMessage && (
            <div role="alert" className={authErrorBox}>
              <p>{errorMessage}</p>
              {existingEmail && (
                <p className="mt-2">
                  <Link to="/login" className={authLink}>Faça login</Link>
                  {' ou '}
                  <Link to="/recuperar-senha" className={authLink}>recupere sua senha</Link>.
                </p>
              )}
            </div>
          )}

          <button type="submit" disabled={signupMutation.isPending} className={authButton}>
            {signupMutation.isPending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
