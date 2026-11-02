import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useDeleteWallet, walletsQueryKey } from './useWallets'
import { useWalletStore } from '../walletStore'

const remove = vi.hoisted(() => vi.fn())
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('../services/walletService', () => ({ walletService: { remove } }))
beforeEach(() => { remove.mockReset().mockResolvedValue(undefined); useWalletStore.setState({ selectedByUser: { owner: 'secondary', other: 'unrelated' } }) })
function setup() {
  const client = new QueryClient()
  client.setQueryData(walletsQueryKey('owner'), [{ id: 'default', user_id: 'owner', is_default: true }, { id: 'secondary', user_id: 'owner', is_default: false }])
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => useDeleteWallet(), { wrapper }) }
}
it('remove carteira do cache e volta à principal apenas após sucesso', async () => {
  const { client, result } = setup()
  await act(async () => { await result.current.mutateAsync({ walletId: 'secondary', confirmationName: 'Viagem' }) })
  expect(remove).toHaveBeenCalledWith('secondary', 'Viagem')
  expect(client.getQueryData(walletsQueryKey('owner'))).toEqual([{ id: 'default', user_id: 'owner', is_default: true }])
  expect(useWalletStore.getState().selectedByUser).toEqual({ owner: 'default', other: 'unrelated' })
})
it('preserva seleção e cache quando o servidor recusa a exclusão', async () => {
  remove.mockRejectedValueOnce(new Error('blocked'))
  const { client, result } = setup()
  await act(async () => { await expect(result.current.mutateAsync({ walletId: 'secondary', confirmationName: 'Viagem' })).rejects.toThrow('blocked') })
  expect(client.getQueryData(walletsQueryKey('owner'))).toHaveLength(2)
  expect(useWalletStore.getState().selectedByUser.owner).toBe('secondary')
})
it('não troca uma outra carteira que já estava selecionada', async () => {
  const { result } = setup()
  useWalletStore.getState().selectWallet('owner', 'default')
  await act(async () => { await result.current.mutateAsync({ walletId: 'secondary', confirmationName: 'Viagem' }) })
  expect(useWalletStore.getState().selectedByUser.owner).toBe('default')
})
