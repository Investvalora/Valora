/**
 * AnalisePage — shell de layout para o novo fluxo desktop.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados (Modal/ScoreRuleForm) vai para AnaliseScore.
 */
import { Outlet } from 'react-router-dom'
import { SubTabBar } from '../../ativos/components/SubTabBar'

const ANALISE_TABS = [
  { label: 'Visão geral', to: '/analise/visao-geral' },
  { label: 'Score', to: '/analise/score' },
  { label: 'Alertas', to: '/analise/alertas' },
]

export function AnalisePage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
      {/* ── Cabeçalho mobile ── */}
      <div className="md:hidden flex items-center px-0 h-14 -my-2">
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
