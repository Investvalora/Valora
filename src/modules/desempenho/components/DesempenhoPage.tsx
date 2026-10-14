/**
 * DesempenhoPage — shell de layout para o novo fluxo desktop.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados foi movida para os componentes-folha.
 */
import { Outlet } from 'react-router-dom'
import { SubTabBar } from '../../ativos/components/SubTabBar'

const DESEMPENHO_TABS = [
  { label: 'Visão geral', to: '/desempenho/visao-geral' },
  { label: 'Rentabilidade', to: '/desempenho/rentabilidade' },
  { label: 'Proventos', to: '/desempenho/proventos' },
]

export function DesempenhoPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
      {/* ── Cabeçalho mobile ── */}
      <div className="md:hidden flex items-center px-0 h-14 -my-2">
        <h1 className="font-['Poppins'] font-semibold text-[20px] text-white">Desempenho</h1>
      </div>

      {/* ── Cabeçalho desktop ── */}
      <div className="hidden md:flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Desempenho</h1>
      </div>

      {/* ── Sub-tabs ── */}
      <SubTabBar tabs={DESEMPENHO_TABS} />

      {/* ── Conteúdo da sub-rota ── */}
      <Outlet />
    </div>
  )
}
