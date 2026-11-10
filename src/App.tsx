import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/services/queryClient'
import { AppRoutes } from './routes'
import { AuthProvider } from './modules/auth/components/AuthProvider'
import { SessionRecovery } from './modules/auth/components/SessionRecovery'
import { AppErrorBoundary } from './shared/components/AppErrorBoundary'

function App() {
  return (
    <AppErrorBoundary><QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <SessionRecovery />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider></AppErrorBoundary>
  )
}

export default App
