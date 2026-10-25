/**
 * AtivosPage — shell de layout para o novo fluxo desktop.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados e KPIs foi movida para os componentes-folha (AtivosPosicoes, etc.).
 */
import { Outlet } from 'react-router-dom'
import { AssetFilterButton, AssetFiltersPanel, ActiveAssetFilters } from './AssetFiltersPanel'
import { SubTabBar } from './SubTabBar'

const ATIVOS_TABS = [
  { label: 'Posições', to: '/ativos/posicoes' },
  { label: 'Composição', to: '/ativos/composicao' },
  { label: 'Lançamentos', to: '/ativos/lancamentos' },
]

export function AtivosPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Ativos</h1>

        <div className="ml-auto flex items-center gap-2">
          <AssetFilterButton />
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <SubTabBar tabs={ATIVOS_TABS} mobileVariant="segmented" />
      <ActiveAssetFilters />

      {/* ── Conteúdo da sub-rota ── */}
      <Outlet />
      <AssetFiltersPanel />
    </div>
  )
}
