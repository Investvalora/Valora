import { useEffect, useState } from 'react'
import { LoadingState } from './LoadingState'

export function RouteLoadingFallback() {
  const [slow, setSlow] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 15000)
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return <div className="mx-auto w-full max-w-5xl space-y-4 p-5 text-sm text-white/70">
    <LoadingState variant="page" label={!online ? 'Sem conexão. Conecte-se à internet para carregar esta tela.' : slow ? 'O carregamento está demorando mais que o esperado.' : 'Carregando…'} />
    {(slow || !online) && <><p>Você pode aguardar ou recarregar. Recarregar pode descartar campos não salvos.</p><button type="button" className="min-h-11 rounded-full border border-white/15 px-5 py-2 text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple" onClick={() => window.location.reload()}>Recarregar aplicativo</button></>}
  </div>
}
