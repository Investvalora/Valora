import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { ASSET_CLASS_COLOR, assetClassLabel } from '../../portfolio/composition'
import type { AssetClassKey } from '../../portfolio/types'
import { useAssetFilters } from '../hooks/useAssetFilters'

export function AssetFilterButton() {
  const { query, types, open } = useAssetFilters()
  const count = types.length + (query ? 1 : 0)
  return <button type="button" onClick={open} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 ${count ? 'border-nf-blue/60 text-nf-blue' : 'border-white/10 text-white/70'}`}>
    <Filter className="h-3.5 w-3.5" aria-hidden="true" />Filtrar{count > 0 && <span aria-label={`${count} filtros ativos`}>({count})</span>}
  </button>
}

function FilterEditor() {
  const { query, types, apply, close } = useAssetFilters()
  const [draftQuery, setDraftQuery] = useState(query)
  const [draftTypes, setDraftTypes] = useState(() => new Set(types))
  const options: AssetClassKey[] = [...Object.keys(ASSET_CLASS_COLOR) as AssetClassKey[], 'unknown']
  return <Modal isOpen title="Filtrar ativos" variant="score" onClose={close} initialFocusSelector="#asset-filter-query">
    <p className="mb-6 text-sm text-white/50">Filtre as posições, a composição e os lançamentos da carteira selecionada.</p>
    <form onSubmit={(event) => { event.preventDefault(); apply({ query: draftQuery, types: [...draftTypes] }) }}>
      <label htmlFor="asset-filter-query" className="mb-2 block text-sm text-white/80">Ticker ou nome do ativo</label>
      <input id="asset-filter-query" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Ex.: PETR4, Petrobras, fundos…" className="mb-6 min-h-11 w-full rounded-lg border border-white/15 bg-[#262626] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-nf-blue" />
      <fieldset>
        <legend className="mb-4 text-sm font-semibold text-white/80">Tipo de ativo</legend>
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={draftTypes.size === 0} onChange={() => setDraftTypes(new Set())} className="h-4 w-4 accent-[#7987FF]" />Todos os tipos</label>
        <div className="grid grid-cols-2 gap-4">
          {options.map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={draftTypes.has(type)} className="h-4 w-4 accent-[#7987FF]" onChange={() => setDraftTypes((previous) => {
              const next = new Set(previous)
              if (next.has(type)) next.delete(type); else next.add(type)
              return next
            })} />{assetClassLabel(type)}
          </label>)}
        </div>
      </fieldset>
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button type="button" onClick={() => { setDraftQuery(''); setDraftTypes(new Set()) }} className="text-sm text-nf-blue">Limpar seleção</button>
        <div className="flex gap-3"><button type="button" onClick={close} className="text-sm text-white/60">Cancelar</button><button type="submit" className="rounded-lg bg-nf-blue px-4 py-2 text-sm font-medium text-white">Aplicar filtros</button></div>
      </div>
    </form>
  </Modal>
}

export function AssetFiltersPanel() {
  const { isOpen } = useAssetFilters()
  return isOpen ? <FilterEditor /> : null
}

export function ActiveAssetFilters() {
  const { query, types, clear } = useAssetFilters()
  if (!query && types.length === 0) return null
  return <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-nf-blue/20 bg-nf-blue/5 px-4 py-3 text-xs text-white/70">
    <span>Resultado filtrado:</span>
    {query && <span className="rounded-full bg-white/10 px-2 py-1">Busca: {query}</span>}
    {types.map((type) => <span key={type} className="rounded-full bg-white/10 px-2 py-1">{assetClassLabel(type)}</span>)}
    <span className="text-white/40">Resumo e gráficos refletem os filtros.</span>
    <button type="button" onClick={clear} className="ml-auto text-nf-blue hover:underline">Limpar filtros</button>
  </div>
}
