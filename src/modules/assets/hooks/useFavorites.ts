import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { favoritesService } from '../services/favoritesService'

export function useFavorites() {
  const { user } = useAuth()
  const client = useQueryClient()
  const userId = user?.id
  const key = ['asset-favorites', userId]
  const query = useQuery({
    queryKey: key,
    queryFn: () => favoritesService.list(userId!),
    enabled: !!userId,
    refetchOnWindowFocus: 'always',
  })
  const mutation = useMutation({
    mutationFn: ({ ticker, favorite }: { ticker: string; favorite: boolean }) => {
      if (!userId) throw new Error('Sessão não encontrada.')
      return favoritesService.set(userId, ticker, favorite)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
  return { ...query, mutation, signedIn: !!userId }
}
