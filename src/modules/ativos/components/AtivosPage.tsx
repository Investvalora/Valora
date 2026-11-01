/**
 * AtivosPage — shell de layout para o novo fluxo desktop.
 * Header + tabs fixos no topo; conteúdo scrollável abaixo.
 */
import { Outlet } from 'react-router-dom'
import { AssetFilterButton, AssetFiltersPanel, ActiveAssetFilters } from './AssetFiltersPanel'
import { SubTabBar } from './SubTabBar'
import { AssetCatalogSearch } from './AssetCatalogSearch'
import { FavoritesList } from '../../assets/components/FavoritesList'

const ATIVOS_TABS = [
  { label: 'Posições', to: '/ativos/posicoes' },
  { label: 'Composição', to: '/ativos/composicao' },
  { label: 'Lançamentos', to: '/ativos/lancamentos' },
]

export function AtivosPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header + tabs fixos ── */}
      <div className="shrink-0 px-4 pb-3 pt-4 md:px-0 md:pt-2">
        <div className="flex items-center gap-3 pb-4">
          <h1 className="text-[22px] font-semibold text-white">Ativos</h1>
          <div className="ml-auto flex items-center gap-2">
            <AssetCatalogSearch />
            <FavoritesList />
            <AssetFilterButton />
          </div>
        </div>
        <SubTabBar tabs={ATIVOS_TABS} mobileVariant="segmented" />
        <ActiveAssetFilters />
      </div>

      {/* ── Conteúdo scrollável — pb absorve a nav mobile ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))] md:px-0 md:pb-10">
        <Outlet />
      </div>

      <AssetFiltersPanel />
    </div>
  )
}
