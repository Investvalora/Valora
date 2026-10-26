import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, LoginSchema } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { useAuthStore } from '../store'
import { AuthLayout } from './AuthLayout'
import { authButton, authErrorBox, authFieldError, authInput, authLabel, authLink } from './authStyles'


//icon google da tela de login
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M21.35 12.24c0-.71-.06-1.4-.18-2.06H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.53h3.15c1.84-1.7 2.9-4.2 2.9-7.31Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.2l-3.15-2.53c-.87.59-1.99.94-3.3.94-2.54 0-4.69-1.71-5.46-4.01H3.3v2.61A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.54 13.95a5.87 5.87 0 0 1 0-3.9V7.44H3.3a9.74 9.74 0 0 0 0 9.12l3.24-2.61Z" />
      <path fill="#EA4335" d="M12 6.04c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.83 3.12 14.62 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.44l3.24 2.61C7.31 7.75 9.46 6.04 12 6.04Z" />
    </svg>
  )
}

export function LoginForm() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

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

  const googleLoginMutation = useMutation({
    mutationFn: authService.loginWithGoogle,
    onError: () => setErrorMessage('Não foi possível iniciar o login com Google. Tente novamente.'),
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
        <p className="mt-3 text-[10px] leading-relaxed text-[#777a80]">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
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

        {errorMessage && <p role="alert" className={authErrorBox}>{errorMessage}</p>}

        <button type="submit" disabled={loginMutation.isPending} className={authButton}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="flex items-center gap-3 py-1 text-xs text-[#777a80]" aria-hidden="true">
          <span className="h-px flex-1 bg-white/[0.12]" />
          ou
          <span className="h-px flex-1 bg-white/[0.12]" />
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage('')
            googleLoginMutation.mutate()
          }}
          disabled={googleLoginMutation.isPending}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-white/[0.28] bg-transparent px-4 text-base font-semibold text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9bdb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1d] disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-10 lg:text-sm"
        >
          <GoogleIcon />
          {googleLoginMutation.isPending ? 'Redirecionando...' : 'Continuar com Google'}
        </button>
      </form>
    </AuthLayout>
  )
}
