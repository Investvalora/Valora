import { useEffect, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { useAssetSearch } from '../portfolio/hooks/useAssetSearch'
import { assetClassLabel } from '../portfolio/composition'
import type { Asset } from '../portfolio/types'

export function CatalogStep({ term, selectedTicker, onChange, onSelect }: {
  term: string
  selectedTicker?: string
  onChange: (value: string) => void
  onSelect: (asset: Asset) => void
}) {
  const [query, setQuery] = useState(term.trim())
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(term.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [term])
  const results = useAssetSearch(query)
  const searching = term.trim().length >= 2
  const waiting = query !== term.trim() || results.isFetching

  return (
    <div className="space-y-3">
      <label htmlFor="first-access-search" className="block text-sm font-medium text-white/80">Nome ou ticker</label>
      <div className="relative">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5cc8ff]" />
        <input id="first-access-search" type="search" autoComplete="off" value={term} onChange={event => onChange(event.target.value)}
          placeholder="Ex.: Petrobras ou PETR4" className="min-h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 text-base text-white placeholder:text-white/45 focus:border-[#5cc8ff] focus:outline-none" />
      </div>
      {!searching ? <p className="text-sm text-white/65">Digite pelo menos dois caracteres para buscar no catálogo.</p>
        : waiting ? <p role="status" className="text-sm text-white/65">Buscando ativos…</p>
          : results.isError ? <button type="button" onClick={() => void results.refetch()} className="min-h-11 text-sm text-[#5cc8ff] underline">Tentar buscar ativos novamente</button>
            : !results.data?.length ? <p role="status" className="text-sm text-white/65">Nenhum ativo encontrado. Tente outro nome ou ticker.</p>
              : <ul aria-label="Resultados do catálogo" className="divide-y divide-white/10">
                {results.data.map(asset => <li key={asset.ticker}>
                  <button type="button" aria-pressed={selectedTicker === asset.ticker} onClick={() => onSelect(asset)} className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 aria-pressed:bg-[#3f7dff]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5cc8ff]">
                    <span className="min-w-0 flex-1"><strong className="block text-sm">{asset.ticker}</strong><span className="block break-words text-xs text-white/65">{asset.name}</span></span>
                    <span className="text-right text-xs text-white/60">{assetClassLabel(asset.type)} · {asset.currency}</span>
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">{selectedTicker === asset.ticker && <Check size={16} className="text-[#5cc8ff]" />}</span>
                  </button>
                </li>)}
              </ul>}
    </div>
  )
}
