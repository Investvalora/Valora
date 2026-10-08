/**
 * AtivosPage — shell de layout para o novo fluxo desktop.
 * Renderiza o cabeçalho, SubTabBar e <Outlet> para as sub-rotas.
 * A lógica de dados e KPIs foi movida para os componentes-folha (AtivosPosicoes, etc.).
 */
import { Outlet } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { SubTabBar } from './SubTabBar'

const ATIVOS_TABS = [
  { label: 'Posições', to: '/ativos/posicoes' },
  { label: 'Composição', to: '/ativos/composicao' },
  { label: 'Lançamentos', to: '/ativos/lancamentos' },
]

export function AtivosPage() {
  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Ativos</h1>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="
              flex items-center gap-1.5 rounded-full
              border border-white/[0.1] bg-[#393939]
              px-3.5 py-1.5 text-[13px] font-medium text-white
              transition-colors hover:bg-white/[0.12]
            "
          >
            <Filter className="h-3.5 w-3.5 text-white/70" strokeWidth={1.8} aria-hidden="true" />
            Filtrar
          </button>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <SubTabBar tabs={ATIVOS_TABS} />

      {/* ── Conteúdo da sub-rota ── */}
      <Outlet />
    </div>
  )
}
