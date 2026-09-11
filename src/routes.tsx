import { Navigate, Routes, Route } from 'react-router-dom'
import { Layout } from './shared/components/Layout'
import { SignupForm } from './modules/auth/components/SignupForm'
import { LoginForm } from './modules/auth/components/LoginForm'
import { ProtectedRoute } from './modules/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from './modules/auth/components/PublicOnlyRoute'
import { PasswordRecoveryForm } from './modules/auth/components/PasswordRecoveryForm'
import { ResetPasswordForm } from './modules/auth/components/ResetPasswordForm'
import { CarteiraPage } from './modules/portfolio/components/CarteiraPage'
import { TransactionImportPage } from './modules/portfolio/components/TransactionImportPage'
import { AlertsPage } from './modules/alerts/components/AlertsPage'
import { PatrimonioPage } from './modules/wealth/components/PatrimonioPage'
import { ProventosPage } from './modules/dividends/components/ProventosPage'
import { RentabilidadePage } from './modules/performance/components/RentabilidadePage'
import { ScorePage } from './modules/score/components/ScorePage'
import { EstrategiasPage } from './modules/valuation/components/EstrategiasPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/cadastro" element={<SignupForm />} />
        <Route path="/recuperar-senha" element={<PasswordRecoveryForm />} />
      </Route>
      <Route path="/signup" element={<Navigate to="/cadastro" replace />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<CarteiraPage />} />
          <Route path="carteira" element={<CarteiraPage />} />
          <Route path="carteira/importar-transacoes" element={<TransactionImportPage />} />
          <Route path="patrimonio" element={<PatrimonioPage />} />
          <Route path="proventos" element={<ProventosPage />} />
          <Route path="rentabilidade" element={<RentabilidadePage />} />
          <Route path="score" element={<ScorePage />} />
          <Route path="estrategias" element={<EstrategiasPage />} />
          <Route path="alertas" element={<AlertsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
