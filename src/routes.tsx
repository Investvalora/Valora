import { Suspense } from 'react'
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
import { useIsMobile } from './shared/hooks/useIsMobile'

// ── Placeholder para sub-rotas ainda não implementadas ─────────────────────
function Placeholder() {
  return <div className="p-8 text-white/40">Em breve…</div>
}

function LoadingFallback() {
  return (
    <div className="flex h-40 items-center justify-center">
      <span className="text-sm text-white/40 animate-pulse">Carregando…</span>
    </div>
  )
}

// ── Lazy imports para componentes-folha futuros ────────────────────────────
// Quando os componentes existirem, substituir Placeholder pelos lazy imports:
// const AtivosPosicoes = lazy(() => import('./modules/ativos/components/AtivosPosicoes'))

function HomeRoute() {
  const isMobile = useIsMobile()

  return isMobile ? <Navigate to="/carteira" replace /> : <InicioPage />
}

function IndexRoute() {
  const isMobile = useIsMobile()

  return <Navigate to={isMobile ? '/carteira' : '/inicio'} replace />
}

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
          <Route index element={<IndexRoute />} />

          {/* Novo fluxo */}
          <Route path="inicio" element={<HomeRoute />} />

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

          {/* ── Ativos — sub-rotas ── */}
          <Route path="ativos" element={<AtivosPage />}>
            <Route index element={<Navigate to="posicoes" replace />} />
            <Route path="posicoes"    element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="composicao"  element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="lancamentos" element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
          </Route>

          {/* ── Desempenho — sub-rotas ── */}
          <Route path="desempenho" element={<DesempenhoPage />}>
            <Route index element={<Navigate to="rentabilidade" replace />} />
            <Route path="visao-geral"   element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="rentabilidade" element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="proventos"     element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
          </Route>

          {/* ── Análise — sub-rotas ── */}
          <Route path="analise" element={<AnalisePage />}>
            <Route index element={<Navigate to="score" replace />} />
            <Route path="visao-geral" element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="score"       element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
            <Route path="alertas"     element={<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
