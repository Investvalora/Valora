/**
 * AnalisePage — shell de layout para as sub-rotas de Análise.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados (Modal/ScoreRuleForm) vai para AnaliseScore.
 */
import { Outlet, useLocation } from 'react-router-dom'
import { SubTabBar } from '../../ativos/components/SubTabBar'

import { ANALISE_TABS } from '../analiseTabs'

export function AnalisePage() {
  const { pathname } = useLocation()
  if (pathname === '/analise/estrategias') return <Outlet />
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
      <div className="flex items-center gap-3">
        <h1 className="font-sans text-[22px] font-semibold text-white">Análise</h1>
      </div>

      {/* ── Sub-tabs ── */}
      <SubTabBar tabs={ANALISE_TABS} mobileVariant="segmented" />

      {/* ── Conteúdo da sub-rota ── */}
      <Outlet />
    </div>
  )
}
