import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface WalletSelectionState {
  selectedByUser: Record<string, string>
  selectWallet: (userId: string, walletId: string) => void
}

export const useWalletStore = create<WalletSelectionState>()(
  persist(
    (set) => ({
      selectedByUser: {},
      selectWallet: (userId, walletId) => {
        set((state) => ({
          selectedByUser: {
            ...state.selectedByUser,
            [userId]: walletId,
          },
        }))
      },
    }),
    {
      name: 'valora-selected-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedByUser: state.selectedByUser }),
    },
  ),
)
