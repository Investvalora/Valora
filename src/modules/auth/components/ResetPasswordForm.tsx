import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ResetPasswordSchema, resetPasswordSchema } from '../schemas/passwordRecoverySchema'
import { PASSWORD_HELP } from '../schemas/passwordSchema'
import { authService } from '../services/authService'
import { AuthLayout } from './AuthLayout'
import { authButton, authErrorBox, authFieldError, authInput, authLabel, authLink, authSuccessBox } from './authStyles'

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: async () => {
      await authService.logout()
      setErrorMessage('')
      setSuccessMessage('Senha redefinida com sucesso. Redirecionando para o login...')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    },
    onError: (error: Error) => {
      console.error('Reset password error:', error)
      setSuccessMessage('')
      setErrorMessage(error.message || 'Link expirado ou inválido. Solicite um novo link de recuperação.')
    },
  })

  const onSubmit = (data: ResetPasswordSchema) => {
    setSuccessMessage('')
    setErrorMessage('')
    resetMutation.mutate(data.password)
  }

  return (
    <AuthLayout
      prioritizeFormOnMobile
      title="Nova senha"
      description={PASSWORD_HELP}
      footer={<Link to="/login" className={authLink}>Voltar para login</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className={authLabel}>Nova senha</label>
          <input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'reset-password-error' : undefined} className={authInput} placeholder="Mínimo 8 caracteres" />
          {errors.password && <p id="reset-password-error" className={authFieldError}>{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabel}>Confirmar nova senha</label>
          <input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined} className={authInput} placeholder="Repita a nova senha" />
          {errors.confirmPassword && <p id="reset-confirm-error" className={authFieldError}>{errors.confirmPassword.message}</p>}
        </div>

        {successMessage && <p role="status" className={authSuccessBox}>{successMessage}</p>}
        {errorMessage && (
          <div role="alert" className={authErrorBox}>
            <p>{errorMessage}</p>
            <Link to="/recuperar-senha" className={`mt-2 inline-block ${authLink}`}>Solicitar novo link</Link>
          </div>
        )}

        <button type="submit" disabled={resetMutation.isPending} className={authButton}>
          {resetMutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthLayout>
  )
}
