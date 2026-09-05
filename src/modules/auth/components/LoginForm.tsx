import { useState } from 'react'
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
      navigate('/carteira')
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
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface rounded-lg shadow-xl p-8 border border-dark-border">
          <h1 className="text-3xl font-bold text-white mb-2">Entrar</h1>
          <p className="text-gray-400 mb-8">
            Acesse sua carteira de investimentos
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sua senha"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
              <div className="mt-2 text-right">
                <Link to="/recuperar-senha" className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Ainda não tem uma conta?{' '}
            <Link to="/cadastro" className="text-blue-400 hover:text-blue-300 font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
