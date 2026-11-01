import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { assetClassLabel } from '../../portfolio/composition'
import { useFavorites } from '../hooks/useFavorites'
import { FavoriteButton } from './FavoriteButton'

function FavoritesContent({ onClose }: { onClose: () => void }) {
  const { data = [], isPending, isError, refetch } = useFavorites()
  if (isPending) return <p role="status">Carregando favoritos…</p>
  if (isError) return <div role="alert"><p>Não foi possível carregar os favoritos.</p><button type="button" onClick={() => refetch()} className="min-h-11 underline">Tentar novamente</button></div>
  return <div className="space-y-4">
    <p className="text-sm text-white/65">Sua lista acompanha a conta em todas as carteiras. Para adicionar, abra o resumo de um ativo e toque em Favoritar.</p>
    {data.length === 0 ? <p>Nenhum favorito ainda. Use Buscar em Ativos para encontrar um ativo.</p>
      : <ul aria-label="Ativos favoritos" className="space-y-3">{data.map(({ ticker, asset }) => <li key={ticker} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 p-3">
        <Link onClick={onClose} to={`/ativo/${encodeURIComponent(ticker)}`} className="min-w-0 flex-1 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">
          <span className="block font-semibold">{ticker}</span><span className="block break-words text-sm text-white/65">{asset?.name ?? ticker}</span>
          {asset && <span className="text-xs text-white/50">{assetClassLabel(asset.type)} · {asset.currency}</span>}
        </Link><FavoriteButton ticker={ticker} />
      </li>)}</ul>}
  </div>
}

export function FavoritesList() {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-white/85" aria-label="Abrir favoritos">
      <Star aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Favoritos</span>
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Favoritos" variant="transaction">
      {open && <FavoritesContent onClose={() => setOpen(false)} />}
    </Modal>
  </>
}
