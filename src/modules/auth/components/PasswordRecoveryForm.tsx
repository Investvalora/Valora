import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PasswordRecoverySchema, passwordRecoverySchema } from '../schemas/passwordRecoverySchema'
import { authService } from '../services/authService'

export function PasswordRecoveryForm() {
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
      setSuccessMessage('Email enviado com instruções para redefinir sua senha.')
    },
    onError: (error: Error) => {
      console.error('Password recovery error:', error)
      setSuccessMessage('')
      setErrorMessage(error.message || 'Erro ao enviar email de recuperação. Tente novamente.')
    },
  })

  const onSubmit = (data: PasswordRecoverySchema) => {
    setSuccessMessage('')
    setErrorMessage('')
    recoveryMutation.mutate(data.email)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface rounded-lg shadow-xl p-8 border border-dark-border">
          <h1 className="text-3xl font-bold text-white mb-2">Recuperar Senha</h1>
          <p className="text-gray-400 mb-8">
            Informe seu email para receber as instruções de redefinição.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
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
              </div>
            )}

            <button
              type="submit"
              disabled={recoveryMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {recoveryMutation.isPending ? 'Enviando...' : 'Enviar instruções'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Lembrou sua senha?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Voltar para login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
