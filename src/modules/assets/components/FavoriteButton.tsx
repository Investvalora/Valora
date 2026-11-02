import { Star } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

export function FavoriteButton({ ticker }: { ticker: string }) {
  const { data = [], isPending, isError, refetch, mutation, signedIn } = useFavorites()
  const favorite = data.some(asset => asset.ticker === ticker)
  if (isError) return <button type="button" onClick={() => refetch()} className="min-h-11 text-sm text-nf-pink">Tentar carregar favoritos</button>
  return <div>
    <button type="button" aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${ticker} ${favorite ? 'dos' : 'aos'} favoritos`}
      disabled={!signedIn || isPending || mutation.isPending}
      onClick={() => mutation.mutate({ ticker, favorite: !favorite })}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-white/85 disabled:opacity-50">
      <Star aria-hidden="true" className={`h-4 w-4 ${favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
      {favorite ? 'Favoritado' : 'Favoritar'}
    </button>
    {mutation.isError && <p role="alert" className="mt-1 text-xs text-nf-pink">Não foi possível alterar o favorito. Tente novamente.</p>}
  </div>
}
