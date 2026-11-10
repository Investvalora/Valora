import { useEffect, useState, type CSSProperties } from 'react'
import { Star } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

const rayColors = ['#F472B6', '#4ADE80', '#FB7185', '#A78BFA', '#34D399', '#F87171', '#60A5FA', '#F9A8D4']

export function FavoriteButton({ ticker }: { ticker: string }) {
  const { data = [], isPending, isError, refetch, mutation, signedIn } = useFavorites()
  const favorite = data.some(asset => asset.ticker === ticker)
  const [celebrating, setCelebrating] = useState(false)
  const [shrinking, setShrinking] = useState(false)
  const [hideFill, setHideFill] = useState(false)
  const displayFavorite = !hideFill && (favorite || celebrating)
  useEffect(() => {
    setCelebrating(false)
    setShrinking(false)
    setHideFill(false)
  }, [ticker])
  useEffect(() => {
    if (!favorite && hideFill) setHideFill(false)
  }, [favorite, hideFill])
  useEffect(() => {
    if (!celebrating) return
    const timeout = window.setTimeout(() => setCelebrating(false), 650)
    return () => window.clearTimeout(timeout)
  }, [celebrating])
  useEffect(() => {
    if (!shrinking) return
    const timeout = window.setTimeout(() => setShrinking(false), 480)
    return () => window.clearTimeout(timeout)
  }, [shrinking])

  function toggleFavorite() {
    mutation.mutate({ ticker, favorite: !displayFavorite }, {
      onSuccess: () => {
        if (displayFavorite) {
          setCelebrating(false)
          setHideFill(true)
          setShrinking(true)
        } else {
          setShrinking(false)
          setHideFill(false)
          setCelebrating(true)
        }
      },
    })
  }

  if (isError) return <button type="button" onClick={() => refetch()} className="min-h-11 text-sm text-nf-pink">Tentar carregar favoritos</button>
  return <div>
    <button type="button" aria-pressed={displayFavorite} aria-label={`${displayFavorite ? 'Remover' : 'Adicionar'} ${ticker} ${displayFavorite ? 'dos' : 'aos'} favoritos`}
      disabled={!signedIn || isPending || mutation.isPending}
      onClick={toggleFavorite}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-white/85 transition-colors duration-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:opacity-50">
      <span className="relative grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
        <Star className={`h-4 w-4 transition-[fill,color] duration-300 ${displayFavorite ? 'fill-yellow-400 text-yellow-400' : ''} ${celebrating ? 'favorite-star-pop' : ''}`} />
        {shrinking && <Star className="favorite-star-shrink pointer-events-none absolute inset-0 h-4 w-4 fill-yellow-400 text-yellow-400" />}
        {celebrating && rayColors.map((color, index) => (
          <span
            key={index}
            className="favorite-burst-ray pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-0.5 rounded-full"
            style={{ '--ray-angle': `${index * 45}deg`, '--ray-color': color } as CSSProperties}
          />
        ))}
      </span>
      <span className="grid shrink-0" aria-hidden="true">
        <span className={`col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-[240ms] motion-reduce:transition-none ${displayFavorite ? 'opacity-0' : 'opacity-100'}`}>Favoritar</span>
        <span className={`col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-[240ms] motion-reduce:transition-none ${displayFavorite ? 'opacity-100' : 'opacity-0'}`}>Favoritado</span>
      </span>
    </button>
    {mutation.isError && <p role="alert" className="mt-1 text-xs text-nf-pink">Não foi possível alterar o favorito. Tente novamente.</p>}
  </div>
}
