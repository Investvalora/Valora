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
const ProventosPage = () => <div className="p-8 text-white">Proventos (Em desenvolvimento)</div>
const RentabilidadePage = () => <div className="p-8 text-white">Rentabilidade (Em desenvolvimento)</div>
const ScorePage = () => <div className="p-8 text-white">Score (Em desenvolvimento)</div>
const EstrategiasPage = () => <div className="p-8 text-white">Estratégias (Em desenvolvimento)</div>

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
