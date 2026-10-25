import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, LoginSchema } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'
import { AuthLayout } from './AuthLayout'
import { authButton, authErrorBox, authFieldError, authInput, authLabel, authLink } from './authStyles'

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const callbackError = new URLSearchParams(location.search).get('error') ??
    new URLSearchParams(location.hash.slice(1)).get('error')
  const googleMutation = useMutation({
    mutationFn: authService.loginWithGoogle,
    onError: () => setErrorMessage('Não foi possível entrar com Google. Tente novamente ou use email e senha.'),
  })
  const oauthMessage = callbackError === 'access_denied'
    ? 'Login com Google cancelado ou acesso não autorizado. Você pode tentar novamente.'
    : callbackError ? 'Não foi possível concluir a autenticação. Tente novamente.' : ''

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
    <AuthLayout
      prioritizeFormOnMobile
      title="Entrar no Valora"
      description="Acesse sua carteira e suas análises."
      footer={<>
        <p>Ainda não tem uma conta? <Link to="/cadastro" className={authLink}>Criar conta</Link></p>
      </>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={authLabel}>Email</label>
          <input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'login-email-error' : undefined} className={authInput} placeholder="voce@email.com" />
          {errors.email && <p id="login-email-error" className={authFieldError}>{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className={authLabel}>Senha</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'login-password-error' : undefined} className={`${authInput} pr-10`} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9ca1] hover:text-white">
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="login-password-error" className={authFieldError}>{errors.password.message}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#a0a2a6]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-3.5 w-3.5 accent-[#347cbc]" /> Manter conectado</label>
          <Link to="/recuperar-senha" className={authLink}>Esqueci minha senha</Link>
        </div>

        {(errorMessage || oauthMessage) && <p role="alert" className={authErrorBox}>{errorMessage || oauthMessage}</p>}

        <button type="submit" disabled={loginMutation.isPending || googleMutation.isPending} className={authButton}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </button>
        <button type="button" disabled={googleMutation.isPending || loginMutation.isPending} className={authButton} onClick={() => {
          setErrorMessage('')
          googleMutation.mutate()
        }}>
          {googleMutation.isPending ? 'Conectando ao Google...' : 'Entrar com Google'}
        </button>
      </form>
    </AuthLayout>
  )
}
