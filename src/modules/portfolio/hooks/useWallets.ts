import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { walletService, type Wallet, type WalletColor } from '../services/walletService'
import { useWalletStore } from '../walletStore'

export function walletsQueryKey(userId: string | undefined) {
  return ['portfolio', 'wallets', userId] as const
}

export function useWallets() {
  const { user } = useAuth()
  const userId = user?.id
  const selectedByUser = useWalletStore((state) => state.selectedByUser)
  const selectWalletInStore = useWalletStore((state) => state.selectWallet)

  const query = useQuery({
    queryKey: walletsQueryKey(userId),
    queryFn: () => walletService.list(userId!),
    enabled: Boolean(userId),
  })

  const wallets = query.data ?? []
  const savedId = userId ? selectedByUser[userId] : undefined
  const selectedWallet =
    wallets.find((wallet) => wallet.id === savedId) ??
    wallets.find((wallet) => wallet.is_default) ??
    wallets[0] ??
    null

  return {
    ...query,
    wallets,
    selectedWallet,
    selectWallet: (walletId: string) => {
      if (userId && wallets.some((wallet) => wallet.id === walletId)) {
        selectWalletInStore(userId, walletId)
      }
    },
  }
}

export function useCreateWallet() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()
  const selectWallet = useWalletStore((state) => state.selectWallet)

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: WalletColor }) => {
      if (!userId) throw new Error('Sessão não encontrada.')
      return walletService.create(userId, name, color)
    },
    onSuccess: (wallet) => {
      selectWallet(wallet.user_id, wallet.id)
      void queryClient.invalidateQueries({ queryKey: walletsQueryKey(userId) })
    },
  })
}

export function useUpdateWallet() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      walletId,
      name,
      color,
    }: {
      walletId: string
      name: string
      color: WalletColor
    }) => {
      if (!userId) throw new Error('Sessão não encontrada.')
      return walletService.update(userId, walletId, name, color)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletsQueryKey(userId) })
    },
  })
}

export function useDeleteWallet() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId, confirmationName }: { walletId: string; confirmationName: string }) => {
      if (!userId) throw new Error('Sessão não encontrada.')
      return walletService.remove(walletId, confirmationName)
    },
    onSuccess: async (_, { walletId }) => {
      const remaining = (queryClient.getQueryData<Wallet[]>(walletsQueryKey(userId)) ?? []).filter(wallet => wallet.id !== walletId)
      queryClient.setQueryData(walletsQueryKey(userId), remaining)
      const store = useWalletStore.getState()
      const fallback = remaining.find(wallet => wallet.is_default) ?? remaining[0]
      if (userId && fallback && store.selectedByUser[userId] === walletId) {
        store.selectWallet(userId, fallback.id)
      }
      // Portfolio totals, receipts and history can span more than one wallet.
      await queryClient.invalidateQueries()
    },
  })
}
