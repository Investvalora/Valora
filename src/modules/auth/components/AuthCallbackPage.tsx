import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/services/supabaseClient'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const finishAuthentication = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const queryParams = new URLSearchParams(window.location.search)
      const errorCode = hashParams.get('error_code') ?? queryParams.get('error_code')
      const errorDescription = hashParams.get('error_description') ?? queryParams.get('error_description')

      if (errorCode || hashParams.get('error') || queryParams.get('error')) {
        if (!cancelled) {
          setErrorMessage(
            errorCode === 'otp_expired'
              ? 'Este link de confirmação expirou ou já foi utilizado. Solicite um novo email de confirmação.'
              : errorDescription?.replace(/\+/g, ' ') || 'Não foi possível confirmar seu email.',
          )
        }
        return
      }

      const code = queryParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (!cancelled) setErrorMessage('Não foi possível confirmar seu email. Solicite um novo link.')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session && !cancelled) {
        window.history.replaceState({}, document.title, '/auth/callback')
        navigate('/inicio', { replace: true })
      } else if (!cancelled) {
        setErrorMessage('O link de confirmação é inválido ou expirou. Solicite um novo email.')
      }
    }

    void finishAuthentication()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
        <div className="w-full max-w-md rounded-lg border border-dark-border bg-dark-surface p-8 text-center shadow-xl">
          <h1 className="mb-3 text-2xl font-bold text-white">Confirmação de email</h1>
          <p className="mb-6 text-sm text-red-400">{errorMessage}</p>
          <Link to="/cadastro" className="font-medium text-blue-400 hover:text-blue-300">
            Voltar para o cadastro e reenviar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <p className="text-gray-400">Confirmando seu email...</p>
    </div>
  )
}
