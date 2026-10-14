/**
 * AnalisePage — shell de layout para o novo fluxo desktop.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados (Modal/ScoreRuleForm) vai para AnaliseScore.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { SubTabBar } from '../../ativos/components/SubTabBar'

const ANALISE_TABS = [
  { label: 'Visão geral', to: '/analise/visao-geral' },
  { label: 'Score', to: '/analise/score' },
  { label: 'Alertas', to: '/analise/alertas' },
]

export function AnalisePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isVisaoGeral = location.pathname === '/analise/visao-geral'

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
      {/* ── Cabeçalho mobile ── */}
      <div className="md:hidden flex items-center px-0 h-14 -my-2">
        {!isVisaoGeral && (
          <button
            type="button"
            onClick={() => navigate('/analise/visao-geral')}
            className="flex items-center gap-1 text-[12px] text-white/50 mr-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Análise
          </button>
        )}
        <h1 className="font-['Poppins'] font-semibold text-[20px] text-white">Análise</h1>
      </div>

      {/* ── Cabeçalho desktop ── */}
      <div className="hidden md:flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Análise</h1>
      </div>

      {/* ── Sub-tabs ── */}
      <SubTabBar tabs={ANALISE_TABS} />

      {/* ── Conteúdo da sub-rota ── */}
      <Outlet />
    </div>
  )
}
