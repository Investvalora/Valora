/**
 * AnalisePage — shell de layout para as sub-rotas de Análise.
 * Header + tabs fixos no topo; conteúdo scrollável abaixo.
 */
import { Outlet } from 'react-router-dom'
import { SubTabBar } from '../../ativos/components/SubTabBar'
import { ANALISE_TABS } from '../analiseTabs'

export function AnalisePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header + tabs fixos ── */}
      <div className="shrink-0 px-4 pb-3 pt-4 md:px-0 md:pt-2">
        <div className="flex items-center gap-3 pb-4">
          <h1 className="font-sans text-[22px] font-semibold text-white">Análise</h1>
        </div>
        <SubTabBar tabs={ANALISE_TABS} mobileVariant="segmented" />
      </div>

      {/* ── Conteúdo scrollável — pb absorve a nav mobile ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))] md:px-0 md:pb-10">
        <Outlet />
      </div>
    </div>
  )
}
