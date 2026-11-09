/**
 * AtivosPage — shell de layout para o novo fluxo desktop.
 * Header + tabs fixos no topo; conteúdo scrollável abaixo.
 */
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AssetFilterButton, AssetFiltersPanel, ActiveAssetFilters } from './AssetFiltersPanel'
import { SubTabBar } from './SubTabBar'
import { AssetCatalogSearch } from './AssetCatalogSearch'
import { FavoritesList } from '../../assets/components/FavoritesList'
import { useAuth } from '../../auth/hooks/useAuth'
import { selectExploreEntry, useExploreMemory } from '../hooks/useExploreMemory'

const ATIVOS_TABS = [
  { label: 'Posições', to: '/ativos/posicoes' },
  { label: 'Composição', to: '/ativos/composicao' },
  { label: 'Lançamentos', to: '/ativos/lancamentos' },
  { label: 'Explorar', to: '/ativos/explorar' },
]

export function AtivosPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { user } = useAuth()
  const userId = user?.id ?? 'guest'
  const entries = useExploreMemory((state) => state.entries)
  const rememberRoute = useExploreMemory((state) => state.rememberRoute)
  const lastRoute = selectExploreEntry(entries, userId).lastRoute
  const { pathname, search } = useLocation()
  const exploring = pathname.startsWith('/ativos/explorar')
  const exploreTabRoute = exploring ? `/ativos/explorar${search}` : lastRoute
  const tabs = ATIVOS_TABS.map(tab => tab.label === 'Explorar' ? { ...tab, to: exploreTabRoute } : tab)
  useEffect(() => setSearchOpen(exploring), [exploring])
  useEffect(() => {
    if (exploring) rememberRoute(userId, `${pathname}${search}`)
  }, [exploring, pathname, search, rememberRoute, userId])
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header + tabs fixos ── */}
      <div className="shrink-0 px-4 pb-3 pt-4 md:px-0 md:pt-2">
        <div className={`flex min-w-0 items-center pb-4 transition-[gap] duration-[400ms] motion-reduce:transition-none ${searchOpen ? 'gap-0 md:gap-3' : 'gap-3'}`}>
          <h1 className={`shrink-0 overflow-hidden whitespace-nowrap text-[22px] font-semibold text-white transition-[max-width,opacity,filter,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${searchOpen ? 'max-w-0 -translate-x-2 opacity-0 blur-sm md:max-w-32 md:translate-x-0 md:opacity-100 md:blur-none' : 'max-w-32 translate-x-0 opacity-100 blur-none'}`}>Ativos</h1>
          <div className={`ml-auto flex min-w-0 flex-1 items-center justify-end transition-[gap] duration-[400ms] motion-reduce:transition-none md:flex-none ${searchOpen ? 'gap-0 md:gap-2' : 'gap-2'}`}>
            <AssetCatalogSearch open={searchOpen} onOpenChange={setSearchOpen} />
            <div className={`shrink-0 overflow-hidden transition-[max-width,opacity,filter,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${searchOpen ? 'max-w-0 translate-x-2 opacity-0 blur-sm pointer-events-none md:max-w-40 md:translate-x-0 md:opacity-100 md:blur-none md:pointer-events-auto' : 'max-w-40 translate-x-0 opacity-100 blur-none'}`}><FavoritesList /></div>
          </div>
        </div>
        <SubTabBar tabs={tabs} mobileVariant="segmented" />
      </div>

      {/* ── Conteúdo scrollável — pb absorve a nav mobile ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))] md:px-0 md:pb-10">
        {!exploring && <div className="mb-4 space-y-3">
          <div className="flex justify-end"><AssetFilterButton /></div>
          <ActiveAssetFilters />
        </div>}
        <Outlet />
      </div>

      <AssetFiltersPanel />
    </div>
  )
}
