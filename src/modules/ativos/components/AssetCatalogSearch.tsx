import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useAssetSearch } from '../../portfolio/hooks/useAssetSearch'
import { assetClassLabel } from '../../portfolio/composition'

function CatalogResults({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const normalized = term.trim()
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(normalized), 300)
    return () => clearTimeout(timer)
  }, [normalized])
  const { data = [], isFetching, isError, refetch } = useAssetSearch(searchTerm)
  const waiting = normalized !== searchTerm || isFetching

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-white/65">Consulte o resumo de um ativo, mesmo que ele não esteja na sua carteira.</p>
      <div>
        <label htmlFor="catalog-search" className="mb-2 block text-sm text-white/80">Ticker ou nome do ativo</label>
        <input id="catalog-search" type="search" autoComplete="off" value={term}
          onChange={event => setTerm(event.target.value)} placeholder="Ex.: PETR4, Apple, Bitcoin"
          className="min-h-12 w-full rounded-xl border border-white/20 bg-[#242424] px-3 text-base text-white placeholder:text-white/40 focus:border-nf-purple focus:outline-none focus:ring-1 focus:ring-nf-purple" />
      </div>
      <div aria-live="polite">
        {normalized.length < 2 ? <p className="text-sm text-white/60">Digite ao menos 2 caracteres para buscar no catálogo.</p>
          : waiting ? <p className="text-sm text-white/60" role="status">Buscando ativos…</p>
          : isError ? <div role="alert" className="space-y-2"><p className="text-sm text-nf-pink">Não foi possível buscar os ativos.</p><button type="button" onClick={() => refetch()} className="min-h-11 text-sm text-white underline">Tentar novamente</button></div>
          : data.length === 0 ? <p className="text-sm text-white/60">Nenhum ativo encontrado no catálogo. Confira o ticker ou tente outro nome.</p>
          : <><ul aria-label="Ativos encontrados" className="max-h-[45dvh] space-y-2 overflow-y-auto overscroll-contain">
            {data.map(asset => <li key={asset.ticker}>
              <Link to={`/ativo/${encodeURIComponent(asset.ticker)}`} onClick={onClose}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">
                <span className="min-w-0 flex-1"><span className="block font-semibold text-white">{asset.ticker}</span><span className="block break-words text-sm text-white/65">{asset.name}</span><span className="mt-1 block text-xs text-white/50">{assetClassLabel(asset.type)} · {asset.currency}</span></span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-white/50" />
              </Link>
            </li>)}
          </ul><p className="mt-3 text-xs text-white/50">Até 8 resultados. Refine o nome ou ticker para encontrar outros ativos.</p></>}
      </div>
    </div>
  )
}

export function AssetCatalogSearch() {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Buscar ativos no catálogo"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-sm font-medium text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">
      <Search aria-hidden="true" className="h-4 w-4" /><span>Buscar</span>
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Buscar ativos" variant="transaction" initialFocusSelector="#catalog-search">
      {open && <CatalogResults onClose={() => setOpen(false)} />}
    </Modal>
  </>
}
