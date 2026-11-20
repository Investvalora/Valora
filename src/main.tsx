import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/fonts.css'
import './index.css'
import App from './App.tsx'
import { watchPwaUpdates } from './shared/services/pwaUpdates'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Também registra no Vite durante o desenvolvimento para testar a instalação
// em localhost. O worker fonte usa rede para a navegação e não guarda /src,
// preservando as atualizações do Vite.
if ('serviceWorker' in navigator) {
  const registerPwa = () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(watchPwaUpdates)
      .catch((error: unknown) => console.error('Falha ao registrar o PWA:', error))
  }

  if (document.readyState === 'complete') registerPwa()
  else window.addEventListener('load', registerPwa, { once: true })
}
