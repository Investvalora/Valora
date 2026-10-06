import { Navigate, Routes, Route } from 'react-router-dom'
import { AppShellNovo } from './shared/layout/AppShellNovo'
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
import { AtivoDetailPage } from './modules/assets/components/AtivoDetailPage'
import { LancamentosPage } from './modules/portfolio/components/LancamentosPage'
import { AccountPage } from './modules/preferences/components/AccountPage'
import { InicioPage } from './modules/inicio/components/InicioPage'
import { AtivosPage } from './modules/ativos/components/AtivosPage'
import { DesempenhoPage } from './modules/desempenho/components/DesempenhoPage'
import { AnalisePage } from './modules/analise/components/AnalisePage'

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Rotas públicas ── */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login"           element={<LoginForm />} />
        <Route path="/cadastro"        element={<SignupForm />} />
        <Route path="/recuperar-senha" element={<PasswordRecoveryForm />} />
      </Route>
      <Route path="/signup"          element={<Navigate to="/cadastro" replace />} />
      <Route path="/reset-password"  element={<ResetPasswordForm />} />

      {/* ── App principal — novo fluxo ── */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppShellNovo />}>
          {/* Redireciona raiz para Início */}
          <Route index element={<Navigate to="/inicio" replace />} />

          {/* Novo fluxo */}
          <Route path="inicio"     element={<InicioPage />} />

          {/* Rotas legadas mantidas com o mesmo path para não quebrar links existentes */}
          <Route path="carteira"                    element={<CarteiraPage />} />
          <Route path="carteira/importar-transacoes" element={<TransactionImportPage />} />
          <Route path="patrimonio"                  element={<PatrimonioPage />} />
          <Route path="proventos"                   element={<ProventosPage />} />
          <Route path="rentabilidade"               element={<RentabilidadePage />} />
          <Route path="score"                       element={<ScorePage />} />
          <Route path="estrategias"                 element={<EstrategiasPage />} />
          <Route path="alertas"                     element={<AlertsPage />} />
          <Route path="lancamentos"                 element={<LancamentosPage />} />
          <Route path="conta"                       element={<AccountPage />} />
          <Route path="ativo/:ticker"               element={<AtivoDetailPage />} />

          {/* Aliases do novo fluxo → seções legadas enquanto as novas não estão prontas */}
          <Route path="ativos"     element={<AtivosPage />} />
          <Route path="desempenho" element={<DesempenhoPage />} />
          <Route path="analise"    element={<AnalisePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
