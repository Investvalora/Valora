import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ResetPasswordSchema, resetPasswordSchema } from '../schemas/passwordRecoverySchema'
import { authService } from '../services/authService'

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
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface rounded-lg shadow-xl p-8 border border-dark-border">
          <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
          <p className="text-gray-400 mb-8">
            Defina uma nova senha com no mínimo 8 caracteres.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Repita a nova senha"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                <p className="text-sm text-green-400">{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{errorMessage}</p>
                <Link to="/recuperar-senha" className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300 font-medium">
                  Solicitar novo link
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {resetMutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Voltar para login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
