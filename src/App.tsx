import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/services/queryClient'
import { AppRoutes } from './routes'
import { AuthProvider } from './modules/auth/components/AuthProvider'
import { SessionRecovery } from './modules/auth/components/SessionRecovery'
import { AppErrorBoundary } from './shared/components/AppErrorBoundary'
import { TitleUpdater } from './shared/components/TitleUpdater'
import { ActivityFeedback } from './shared/components/ActivityFeedback'
import { useMotionInput } from './shared/hooks/useMotionInput'

function App() {
  useMotionInput()
  return (
    <AppErrorBoundary><QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TitleUpdater />
        <AuthProvider>
          <AppRoutes />
          <ActivityFeedback />
          <SessionRecovery />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider></AppErrorBoundary>
  )
}

export default App
