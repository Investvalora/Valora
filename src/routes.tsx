import { PageTitle } from './shared/components/PageTitle'
import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './modules/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from './modules/auth/components/PublicOnlyRoute'
import { AtivosPage } from './modules/ativos/components/AtivosPage'
import { DesempenhoPage } from './modules/desempenho/components/DesempenhoPage'
import { AnalisePage } from './modules/analise/components/AnalisePage'
import { PublicInfoPage } from './modules/public/components/PublicInfoPage'
import { RouteLoadingFallback as LoadingFallback } from './shared/components/RouteLoadingFallback'

// Páginas menos frequentes são carregadas somente ao acessar a rota.
// A proteção de acesso continua imediata; o shell só é pedido após autenticar.
const AppShellNovo = lazy(() => import('./shared/layout/AppShellNovo').then(m => ({ default: m.AppShellNovo })))
const LoginForm = lazy(() => import('./modules/auth/components/LoginForm').then(m => ({ default: m.LoginForm })))
const SignupForm = lazy(() => import('./modules/auth/components/SignupForm').then(m => ({ default: m.SignupForm })))
const PasswordRecoveryForm = lazy(() => import('./modules/auth/components/PasswordRecoveryForm').then(m => ({ default: m.PasswordRecoveryForm })))
const ResetPasswordForm = lazy(() => import('./modules/auth/components/ResetPasswordForm').then(m => ({ default: m.ResetPasswordForm })))
const AlertsPage = lazy(() => import('./modules/alerts/components/AlertsPage').then(m => ({ default: m.AlertsPage })))
const PatrimonioPage = lazy(() => import('./modules/wealth/components/PatrimonioPage').then(m => ({ default: m.PatrimonioPage })))
const ProventosPage = lazy(() => import('./modules/dividends/components/ProventosPage').then(m => ({ default: m.ProventosPage })))
const RentabilidadePage = lazy(() => import('./modules/performance/components/RentabilidadePage').then(m => ({ default: m.RentabilidadePage })))
const EstrategiasPage = lazy(() => import('./modules/valuation/components/EstrategiasPage').then(m => ({ default: m.EstrategiasPage })))
const NovoInsightPage = lazy(() => import('./modules/valuation/components/NovoInsightPage').then(m => ({ default: m.NovoInsightPage })))
const NovaEstrategiaPage = lazy(() => import('./modules/valuation/components/NovaEstrategiaPage').then(m => ({ default: m.NovaEstrategiaPage })))
const AtivoDetailPage = lazy(() => import('./modules/assets/components/AtivoDetailPage').then(m => ({ default: m.AtivoDetailPage })))
const LancamentosPage = lazy(() => import('./modules/portfolio/components/LancamentosPage').then(m => ({ default: m.LancamentosPage })))
const AccountPage = lazy(() => import('./modules/preferences/components/AccountPage').then(m => ({ default: m.AccountPage })))
const InicioPage = lazy(() => import('./modules/inicio/components/InicioPage').then(m => ({ default: m.InicioPage })))
const WalletsPage = lazy(() => import('./modules/portfolio/components/WalletsPage').then(m => ({ default: m.WalletsPage })))
const TransactionImportPage = lazy(() => import('./modules/portfolio/components/TransactionImportPage').then(m => ({ default: m.TransactionImportPage })))

// ── Lazy imports para sub-rotas de Ativos ─────────────────────────────────
const AtivosPosicoes   = lazy(() => import('./modules/ativos/components/AtivosPosicoes').then((m) => ({ default: m.AtivosPosicoes })))
const AtivosComposicao = lazy(() => import('./modules/ativos/components/AtivosComposicao').then((m) => ({ default: m.AtivosComposicao })))
const AtivosLancamentos = lazy(() => import('./modules/ativos/components/AtivosLancamentos').then((m) => ({ default: m.AtivosLancamentos })))
const AtivosExplorar = lazy(() => import('./modules/ativos/components/AtivosExplorar').then((m) => ({ default: m.AtivosExplorar })))


// ── Lazy imports para sub-rotas de Desempenho ─────────────────────────────
const DesempenhoVisaoGeral    = lazy(() => import('./modules/desempenho/components/DesempenhoVisaoGeral').then((m) => ({ default: m.DesempenhoVisaoGeral })))
const DesempenhoRentabilidade = lazy(() => import('./modules/desempenho/components/DesempenhoRentabilidade').then((m) => ({ default: m.DesempenhoRentabilidade })))
const DesempenhoProventos     = lazy(() => import('./modules/desempenho/components/DesempenhoProventos').then((m) => ({ default: m.DesempenhoProventos })))

// ── Lazy imports para sub-rotas de Análise ────────────────────────────────
const AnaliseVisaoGeral = lazy(() => import('./modules/analise/components/AnaliseVisaoGeral').then((m) => ({ default: m.AnaliseVisaoGeral })))
const AnaliseScore   = lazy(() => import('./modules/analise/components/AnaliseScore').then((m) => ({ default: m.AnaliseScore })))
const AssetComparison = lazy(() => import('./modules/analise/components/AssetComparison').then(m => ({ default: m.AssetComparison })))
const AnaliseAlertas = lazy(() => import('./modules/analise/components/AnaliseAlertas').then((m) => ({ default: m.AnaliseAlertas })))
const ScoreRulePage  = lazy(() => import('./modules/score/components/ScoreRulePage').then((m) => ({ default: m.ScoreRulePage })))

function HomeRoute() {
  // No mobile o novo fluxo tem a InicioPage normalmente na nav
  return <InicioPage />
}

function IndexRoute() {
  // Todos os contextos vão para /inicio (novo fluxo unificado)
  return <Navigate to="/inicio" replace />
}

export function AppRoutes() {
  return (
    <>
    <PageTitle />
    <Suspense fallback={<LoadingFallback />}><Routes>
      {/* ── Rotas públicas ── */}
      <Route path="/sobre" element={<PublicInfoPage page="about" />} />
      <Route path="/privacidade" element={<PublicInfoPage page="privacy" />} />
      <Route path="/termos" element={<PublicInfoPage page="terms" />} />
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
          <Route path="carteira" element={<Navigate to="/ativos/posicoes" replace />} />
          <Route path="carteiras" element={<WalletsPage />} />

          {/* Rotas legadas mantidas com o mesmo path para não quebrar links existentes */}
          <Route path="patrimonio"                  element={<PatrimonioPage />} />
          <Route path="proventos"                   element={<ProventosPage />} />
          <Route path="rentabilidade"               element={<RentabilidadePage />} />
          <Route path="score"                       element={<Navigate to="/analise/score" replace />} />
          <Route path="estrategias"                 element={<EstrategiasPage />} />
          <Route path="alertas"                     element={<AlertsPage />} />
          <Route path="lancamentos"                 element={<LancamentosPage />} />
          <Route path="ativos/importar" element={<TransactionImportPage />} />
          <Route path="conta"                       element={<AccountPage />} />
          <Route path="conta/:section"              element={<AccountPage />} />
          <Route path="ativo/:ticker"               element={<AtivoDetailPage />} />

          {/* ── Ativos — sub-rotas ── */}
          <Route path="ativos" element={<AtivosPage />}>
            <Route index element={<Navigate to="posicoes" replace />} />
            <Route path="posicoes"    element={<Suspense fallback={<LoadingFallback />}><AtivosPosicoes /></Suspense>} />
            <Route path="composicao"  element={<Suspense fallback={<LoadingFallback />}><AtivosComposicao /></Suspense>} />
            <Route path="lancamentos" element={<Suspense fallback={<LoadingFallback />}><AtivosLancamentos /></Suspense>} />
            <Route path="explorar" element={<Suspense fallback={<LoadingFallback />}><AtivosExplorar /></Suspense>} />
            <Route path="explorar/:ticker" element={<Suspense fallback={<LoadingFallback />}><AtivosExplorar /></Suspense>} />
          </Route>

          {/* ── Desempenho — sub-rotas ── */}
          <Route path="desempenho" element={<DesempenhoPage />}>
            <Route index element={<Navigate to="visao-geral" replace />} />
            <Route path="visao-geral"   element={<Suspense fallback={<LoadingFallback />}><DesempenhoVisaoGeral /></Suspense>} />
            <Route path="rentabilidade" element={<Suspense fallback={<LoadingFallback />}><DesempenhoRentabilidade /></Suspense>} />
            <Route path="proventos"     element={<Suspense fallback={<LoadingFallback />}><DesempenhoProventos /></Suspense>} />
          </Route>

          {/* ── Análise — sub-rotas ── */}
          <Route path="analise" element={<AnalisePage />}>
            <Route path="comparar" element={<Suspense fallback={<LoadingFallback />}><AssetComparison /></Suspense>} />
            <Route index element={<Navigate to="visao-geral" replace />} />
            <Route path="visao-geral" element={<Suspense fallback={<LoadingFallback />}><AnaliseVisaoGeral /></Suspense>} />
            <Route path="score"       element={<Suspense fallback={<LoadingFallback />}><AnaliseScore /></Suspense>} />
            <Route path="score/nova"  element={<Suspense fallback={<LoadingFallback />}><ScoreRulePage /></Suspense>} />
            <Route path="estrategias" element={<EstrategiasPage />} />
            <Route path="alertas"     element={<Suspense fallback={<LoadingFallback />}><AnaliseAlertas /></Suspense>} />
          </Route>

          {/* Edição preserva o modal sobre a análise. */}
          <Route path="analise/score/:id/editar"    element={<Suspense fallback={<LoadingFallback />}><ScoreRulePage /></Suspense>} />
          {/* Rota de novo insight — tela dedicada (mobile) ou painel lateral (desktop) */}
          <Route path="analise/estrategias/novo"    element={<NovoInsightPage />} />
          {/* Rota de nova estratégia — tela dedicada (mobile) ou painel lateral (desktop) */}
          <Route path="analise/estrategias/nova"    element={<NovaEstrategiaPage />} />
        </Route>
      </Route>
      <Route path="*" element={
        <main className="mx-auto max-w-lg px-6 py-20 text-center text-white">
          <h1 className="text-2xl font-semibold">Página não encontrada</h1>
          <p className="mt-3 text-white/60">O endereço pode ter mudado. Acesse o início para continuar.</p>
          <a href="/inicio" className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-zinc-950">Ir para o início</a>
          <p className="mt-4 text-sm text-white/60">Saiu da conta? <a href="/login" className="text-nf-blue underline">Entrar novamente</a></p>
        </main>
      } />
    </Routes></Suspense>
    </>
  )
}
